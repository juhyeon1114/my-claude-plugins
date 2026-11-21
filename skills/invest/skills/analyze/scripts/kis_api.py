#!/usr/bin/env python3
"""한국투자증권(KIS) Open API의 시세 조회 클라이언트

사용법:
    kis_api.py <경로> [이름=값 ...] [--pages N] [--out 파일]

예:
    kis_api.py /uapi/domestic-stock/v1/quotations/inquire-price FID_INPUT_ISCD=005930
    kis_api.py /uapi/overseas-price/v1/quotations/inquire-daily-chartprice \\
        FID_COND_MRKT_DIV_CODE=N FID_INPUT_ISCD=SPX FID_INPUT_DATE_1=20260101 FID_INPUT_DATE_2=20261120

GET 요청만 보내고, kis_endpoints.json 에 있는 경로만 호출한다.
넘기지 않은 파라미터는 kis_endpoints.json 의 기본값으로 채운다.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from env_file import ENV_FILE, read_env_file

BASE_URL = "https://openapi.koreainvestment.com:9443"
TOKEN_URL = f"{BASE_URL}/oauth2/tokenP"

ENDPOINTS_FILE = Path(__file__).with_name("kis_endpoints.json")
CREDENTIALS_FILE = Path.home() / ".config" / "kis" / "credentials.json"
TOKEN_CACHE_FILE = Path.home() / ".cache" / "kis" / "token.json"

# 만료 몇 초 전부터 캐시된 토큰을 새로 발급받을지
TOKEN_REFRESH_MARGIN_SECONDS = 600
MAX_RATE_LIMIT_RETRIES = 3
PAGE_INTERVAL_SECONDS = 0.1

RATE_LIMIT_CODE = "EGW00201"
TOKEN_ERROR_CODES = {"EGW00121", "EGW00123"}
# 응답 헤더 tr_cont 가 이 값이면 다음 쪽이 있다
HAS_NEXT_PAGE = {"M", "F"}


class ApiError(Exception):
    """KIS API가 돌려준 에러"""

    def __init__(self, status, body):
        self.status = status
        self.body = body
        self.code = body.get("msg_cd") if isinstance(body, dict) else None
        super().__init__(f"HTTP {status}: {json.dumps(body, ensure_ascii=False)}")


def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)


def load_credentials():
    """환경 변수, .env 파일, 자격 증명 파일 순서로 앱키와 앱시크릿을 읽는다"""
    values = {**read_env_file(), **os.environ}
    app_key = values.get("KIS_APP_KEY")
    app_secret = values.get("KIS_APP_SECRET")
    if app_key and app_secret:
        return app_key, app_secret

    if CREDENTIALS_FILE.exists():
        saved = json.loads(CREDENTIALS_FILE.read_text())
        if saved.get("app_key") and saved.get("app_secret"):
            return saved["app_key"], saved["app_secret"]

    fail(
        "자격 증명이 없습니다. 환경 변수나 "
        f"{ENV_FILE} 에 KIS_APP_KEY, KIS_APP_SECRET 을 넣거나, "
        f"{CREDENTIALS_FILE} 에 {{\"app_key\": ..., \"app_secret\": ...}} 를 저장하세요."
    )


def send(request):
    """요청을 보내고 (응답 헤더, 본문)을 돌려준다"""
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.headers, json.loads(response.read())
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            body = json.loads(raw)
        except ValueError:
            body = {"raw": raw.decode(errors="replace")}
        raise ApiError(error.code, body)


def issue_token(app_key, app_secret):
    """새 접근 토큰을 발급받아 캐시 파일에 저장한다"""
    payload = json.dumps(
        {"grant_type": "client_credentials", "appkey": app_key, "appsecret": app_secret}
    ).encode()
    request = urllib.request.Request(
        TOKEN_URL, data=payload, headers={"Content-Type": "application/json; charset=UTF-8"}
    )
    try:
        _, issued = send(request)
    except ApiError as error:
        fail(f"토큰 발급에 실패했습니다. 토큰은 1분에 한 번만 발급할 수 있습니다. {error}")

    cached = {
        "access_token": issued["access_token"],
        "expires_at": time.time() + int(issued["expires_in"]),
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


def build_params(endpoint, given):
    """기본값에 넘긴 값을 덮어쓴다. 이름은 대소문자를 가리지 않는다"""
    allowed = list(endpoint["params"]) + endpoint.get("extra_params", [])
    by_lower = {name.lower(): name for name in allowed}

    params = dict(endpoint["params"])
    for name, value in given.items():
        real_name = by_lower.get(name.lower())
        if real_name is None:
            fail(f"이 경로에 없는 파라미터입니다: {name}. 쓸 수 있는 파라미터: {', '.join(allowed)}")
        params[real_name] = value
    return params


def get(path, tr_id, params, credentials, token, tr_cont=""):
    """GET 요청 하나를 보낸다. 초당 호출 한도에 걸리면 기다렸다가 다시 보낸다"""
    app_key, app_secret = credentials
    url = f"{BASE_URL}{path}?{urllib.parse.urlencode(params)}"
    headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": tr_id,
        "tr_cont": tr_cont,
        "custtype": "P",
    }
    request = urllib.request.Request(url, headers=headers)

    for attempt in range(MAX_RATE_LIMIT_RETRIES + 1):
        try:
            response_headers, body = send(request)
        except ApiError as error:
            if error.code != RATE_LIMIT_CODE or attempt == MAX_RATE_LIMIT_RETRIES:
                raise
            time.sleep(2 ** attempt)
            continue
        if body.get("rt_cd") != "0":
            raise ApiError(200, body)
        return response_headers, body


def get_with_token(path, tr_id, params, credentials, tr_cont=""):
    """캐시 토큰으로 요청하고, 토큰이 무효면 새로 발급받아 한 번 더 요청한다"""
    token = cached_token() or issue_token(*credentials)
    try:
        return get(path, tr_id, params, credentials, token, tr_cont)
    except ApiError as error:
        if error.code not in TOKEN_ERROR_CODES:
            raise
        return get(path, tr_id, params, credentials, issue_token(*credentials), tr_cont)


def carry_cursor(params, body):
    """응답 본문의 연속 조회 키(ctx_area_fk100 등)를 같은 이름의 파라미터에 옮긴다"""
    by_lower = {name.lower(): name for name in params}
    for key, value in body.items():
        if key.lower() in by_lower and key.lower().startswith(("ctx_area", "keyb", "cts")):
            params[by_lower[key.lower()]] = value
    return params


def fetch_pages(path, endpoint, params, credentials, pages):
    """응답 헤더 tr_cont 를 따라 최대 pages 쪽까지 받아 배열을 하나로 합친다"""
    tr_id = endpoint["tr_id"]
    headers, merged = get_with_token(path, tr_id, params, credentials)

    for _ in range(pages - 1):
        if headers.get("tr_cont") not in HAS_NEXT_PAGE:
            break
        time.sleep(PAGE_INTERVAL_SECONDS)
        params = carry_cursor(dict(params), merged)
        headers, body = get_with_token(path, tr_id, params, credentials, tr_cont="N")
        for key, value in body.items():
            if isinstance(value, list) and isinstance(merged.get(key), list):
                merged[key].extend(value)
            elif key not in ("rt_cd", "msg_cd", "msg1"):
                merged[key] = value
    return merged


def parse_args():
    parser = argparse.ArgumentParser(description="한국투자증권 Open API 시세 조회")
    parser.add_argument("path", help="API 경로. 예: /uapi/domestic-stock/v1/quotations/inquire-price")
    parser.add_argument("params", nargs="*", help="쿼리 파라미터. 예: FID_INPUT_ISCD=005930")
    parser.add_argument("--pages", type=int, default=1, help="연속 조회로 받을 최대 쪽 수")
    parser.add_argument("--out", help="응답을 저장할 파일. 없으면 표준 출력에 쓴다")
    return parser.parse_args()


def main():
    args = parse_args()

    endpoints = json.loads(ENDPOINTS_FILE.read_text())
    endpoint = endpoints.get(args.path)
    if endpoint is None:
        fail(f"허용하지 않는 경로입니다: {args.path}. 이 스크립트는 kis_endpoints.json 의 시세 조회 경로만 호출합니다.")

    given = {}
    for pair in args.params:
        name, separator, value = pair.partition("=")
        if not separator:
            fail(f"파라미터는 이름=값 형식이어야 합니다: {pair}")
        given[name] = value

    params = build_params(endpoint, given)
    credentials = load_credentials()
    try:
        body = fetch_pages(args.path, endpoint, params, credentials, args.pages)
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
