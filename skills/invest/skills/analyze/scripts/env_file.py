"""invest 플러그인의 자격 증명 .env 파일 읽기"""

from pathlib import Path

ENV_FILE = Path.home() / ".claude" / ".env"


def read_env_file():
    """ENV_FILE 의 KEY=VALUE 줄을 dict 로 돌려준다 (파일이 없으면 빈 dict)"""
    if not ENV_FILE.exists():
        return {}
    values = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values
