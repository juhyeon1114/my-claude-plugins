# CNN 공포탐욕지수 (Fear & Greed Index)

## 페이지

`https://edition.cnn.com/markets/fear-and-greed`

## 읽는 방법

1. Claude in Chrome(`mcp__claude-in-chrome__*`)으로 페이지를 연다. 내장 브라우저(`mcp__Claude_Browser__*`)와 WebFetch는 HTTP 451로 막힌다.
2. 지수 숫자는 그래픽이라 `get_page_text`, `read_page` 에 나오지 않는다. `Fear & Greed Index` 제목으로 스크롤한 뒤 스크린샷이나 `zoom` 으로 읽는다.
3. 다 읽으면 연 탭을 닫는다.

Claude in Chrome이 연결되어 있지 않으면, 그 사실과 페이지 링크를 알리고 KIS로 VIX를 조회해 대신 보여준다.

## 읽을 값

| 화면 문구 | 뜻 |
|---|---|
| 가운데 큰 숫자 | 현재 지수 (0~100) |
| `Previous close` | 전일 종가 기준 지수 |
| `1 week ago`, `1 month ago`, `1 year ago` | 1주, 1달, 1년 전 지수 |
| `Last updated` | 갱신 시각 (미국 동부 시각, ET) |

## 등급

| 지수 | 등급 |
|---|---|
| 0~24 | Extreme Fear (극단적 공포) |
| 25~44 | Fear (공포) |
| 45~55 | Neutral (중립) |
| 56~75 | Greed (탐욕) |
| 76~100 | Extreme Greed (극단적 탐욕) |
