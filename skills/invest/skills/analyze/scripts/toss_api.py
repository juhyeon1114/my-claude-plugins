#!/usr/bin/env python3
"""토스증권 Open API의 시세·종목 정보 조회 클라이언트

사용법:
    toss_api.py <경로> [이름=값 ...] [--pages N] [--out 파일]

예:
    toss_api.py /api/v1/prices symbols=005930,AAPL
    toss_api.py /api/v1/candles symbol=005930 interval=1d count=200 --pages 3 --out samsung.json

GET 요청만 보내고, ALLOWED_PATHS 에 없는 경로는 보내지 않는다.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE_URL = "https://openapi.tossinvest.com"
TOKEN_URL = f"{BASE_URL}/oauth2/token"

CREDENTIALS_FILE = Path.home() / ".config" / "toss-invest" / "credentials.json"
TOKEN_CACHE_FILE = Path.home() / ".cache" / "toss-invest" / "token.json"

# 만료 몇 초 전부터 캐시된 토큰을 새로 발급받을지
TOKEN_REFRESH_MARGIN_SECONDS = 60
MAX_RATE_LIMIT_RETRIES = 3
PAGE_INTERVAL_SECONDS = 0.25

SYMBOL = r"[A-Za-z0-9.\-]+"
INDICATOR_SYMBOL = r"[A-Za-z0-9_]+"
SECTOR_ID = r"[A-Za-z0-9_\-]+"

# 호출을 허용하는 시세·종목 정보 경로 (주문, 조건주문, 계좌, 자산 경로는 없다)
ALLOWED_PATHS = [
    r"/api/v1/prices",
    r"/api/v1/orderbook",
    r"/api/v1/trades",
    r"/api/v1/price-limits",
    r"/api/v1/candles",
    r"/api/v1/stocks",
    r"/api/v1/stocks/all",
    rf"/api/v1/stocks/{SYMBOL}/warnings",
    rf"/api/v1/stocks/{SYMBOL}/investor-trading",
    rf"/api/v1/stocks/{SYMBOL}/program-trades",
    rf"/api/v1/stocks/{SYMBOL}/short-selling",
    rf"/api/v1/stocks/{SYMBOL}/credit-trades",
    rf"/api/v1/stocks/{SYMBOL}/securities-lending",
    r"/api/v1/exchange-rate",
    r"/api/v1/market-calendar/(KR|US)",
    r"/api/v1/rankings",
    r"/api/v1/rankings/investor-trading",
    r"/api/v1/market-indicators/prices",
    rf"/api/v1/market-indicators/{INDICATOR_SYMBOL}/candles",
    rf"/api/v1/market-indicators/{INDICATOR_SYMBOL}/investor-trading",
    r"/api/v1/sectors",
    r"/api/v1/sectors/rankings",
    rf"/api/v1/sectors/{SECTOR_ID}",
    rf"/api/v1/sectors/{SECTOR_ID}/stocks",
    rf"/api/v1/sectors/{SECTOR_ID}/etfs",
]

# 다음 페이지 커서 필드와, 그 값을 넣을 쿼리 파라미터
PAGE_CURSORS = {"nextBefore": "before", "nextUntil": "until"}

TOKEN_ERROR_CODES = {"invalid-token", "expired-token", "token-revoked"}


class ApiError(Exception):
    """토스증권 API가 돌려준 에러"""

    def __init__(self, status, body):
        self.status = status
        self.body = body
        self.code = (body.get("error") or {}).get("code") if isinstance(body, dict) else None
        super().__init__(f"HTTP {status}: {json.dumps(body, ensure_ascii=False)}")


def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)


def is_allowed_path(path):
    return any(re.fullmatch(pattern, path) for pattern in ALLOWED_PATHS)


def load_credentials():
    """환경 변수, 없으면 자격 증명 파일에서 client_id 와 client_secret 을 읽는다"""
    client_id = os.environ.get("TOSS_CLIENT_ID")
    client_secret = os.environ.get("TOSS_CLIENT_SECRET")
    if client_id and client_secret:
        return client_id, client_secret

    if CREDENTIALS_FILE.exists():
        saved = json.loads(CREDENTIALS_FILE.read_text())
        if saved.get("client_id") and saved.get("client_secret"):
            return saved["client_id"], saved["client_secret"]

    fail(
        "자격 증명이 없습니다. 환경 변수 TOSS_CLIENT_ID, TOSS_CLIENT_SECRET 을 설정하거나 "
        f"{CREDENTIALS_FILE} 에 {{\"client_id\": ..., \"client_secret\": ...}} 를 저장하세요."
    )


def read_response(request):
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            body = json.loads(raw)
        except ValueError:
            body = {"raw": raw.decode(errors="replace")}
        api_error = ApiError(error.code, body)
        api_error.retry_after = error.headers.get("Retry-After")
        raise api_error


def issue_token():
    """새 액세스 토큰을 발급받아 캐시 파일에 저장한다"""
    client_id, client_secret = load_credentials()
    form = urllib.parse.urlencode(
        {"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret}
    ).encode()
    request = urllib.request.Request(
        TOKEN_URL, data=form, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        issued = read_response(request)
    except ApiError as error:
        if error.status == 403:
            fail(f"토큰 발급이 거부되었습니다. 이 PC의 IP가 허용 IP 목록에 있는지 확인하세요. {error}")
        fail(f"토큰 발급에 실패했습니다. {error}")

    cached = {
        "access_token": issued["access_token"],
        "expires_at": time.time() + issued["expires_in"],
    }
    TOKEN_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_CACHE_FILE.write_text(json.dumps(cached))
    TOKEN_CACHE_FILE.chmod(0o600)
    return cached["access_token"]


def cached_token():
    """만료되지 않은 캐시 토큰, 없으면 None"""
    if not TOKEN_CACHE_FILE.exists():
        return None
    cached = json.loads(TOKEN_CACHE_FILE.read_text())
    if cached["expires_at"] - TOKEN_REFRESH_MARGIN_SECONDS < time.time():
        return None
    return cached["access_token"]


def get(path, params, token):
    """GET 요청 하나를 보내고 응답 본문을 돌려준다. 429면 기다렸다가 다시 보낸다"""
    url = f"{BASE_URL}{path}?{urllib.parse.urlencode(params)}" if params else f"{BASE_URL}{path}"
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

    for attempt in range(MAX_RATE_LIMIT_RETRIES + 1):
        try:
            return read_response(request)
        except ApiError as error:
            if error.status != 429 or attempt == MAX_RATE_LIMIT_RETRIES:
                raise
            wait_seconds = float(error.retry_after) if error.retry_after else 2 ** attempt
            time.sleep(wait_seconds)


def get_with_token(path, params):
    """캐시 토큰으로 요청하고, 토큰이 무효면 새로 발급받아 한 번 더 요청한다"""
    token = cached_token() or issue_token()
    try:
        return get(path, params, token)
    except ApiError as error:
        if error.code not in TOKEN_ERROR_CODES:
            raise
        return get(path, params, issue_token())


def find_list_key(result):
    """페이지 응답 result 에서 레코드 배열이 담긴 키"""
    return next(key for key, value in result.items() if isinstance(value, list))


def fetch_pages(path, params, pages):
    """커서를 따라 최대 pages 쪽까지 받아 레코드 배열을 하나로 합친다"""
    first = get_with_token(path, params)
    result = first.get("result")
    if pages <= 1 or not isinstance(result, dict):
        return first

    list_key = find_list_key(result)
    merged = list(result[list_key])
    for _ in range(pages - 1):
        cursor_field = next((field for field in PAGE_CURSORS if result.get(field)), None)
        if cursor_field is None:
            break
        time.sleep(PAGE_INTERVAL_SECONDS)
        params = {**params, PAGE_CURSORS[cursor_field]: result[cursor_field]}
        result = get_with_token(path, params)["result"]
        merged.extend(result[list_key])

    last_cursors = {field: result.get(field) for field in PAGE_CURSORS if field in result}
    return {"result": {list_key: merged, **last_cursors}}


def parse_args():
    parser = argparse.ArgumentParser(description="토스증권 Open API 시세·종목 정보 조회")
    parser.add_argument("path", help="API 경로. 예: /api/v1/prices")
    parser.add_argument("params", nargs="*", help="쿼리 파라미터. 예: symbols=005930")
    parser.add_argument("--pages", type=int, default=1, help="nextBefore/nextUntil 커서를 따라 받을 최대 쪽 수")
    parser.add_argument("--out", help="응답을 저장할 파일. 없으면 표준 출력에 쓴다")
    return parser.parse_args()


def main():
    args = parse_args()

    if not is_allowed_path(args.path):
        fail(f"허용하지 않는 경로입니다: {args.path}. 이 스크립트는 시세·종목 정보 조회 경로만 호출합니다.")

    params = {}
    for pair in args.params:
        name, separator, value = pair.partition("=")
        if not separator:
            fail(f"파라미터는 이름=값 형식이어야 합니다: {pair}")
        params[name] = value

    try:
        body = fetch_pages(args.path, params, args.pages)
    except ApiError as error:
        fail(str(error))

    text = json.dumps(body, ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(text)
        print(f"저장했습니다: {args.out}")
    else:
        print(text)


if __name__ == "__main__":
    main()
