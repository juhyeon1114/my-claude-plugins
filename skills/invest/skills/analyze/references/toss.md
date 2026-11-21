# 토스증권 Open API

## 목차
- 참고 문서
- 준비
- 호출 방법
- 데이터 해석 주의
- API 목차

## 참고 문서

목차에 있는 API의 세부 파라미터와 응답 필드가 필요할 때만 읽는다.

- 개발자 문서: https://developers.tossinvest.com/docs
- 개요 (인증, Rate Limit, 에러, 웹소켓): https://openapi.tossinvest.com/openapi-docs/overview.md
- FAQ (데이터 이용 정책, 캔들 데이터 범위): https://openapi.tossinvest.com/openapi-docs/faq.md
- API 레퍼런스: https://openapi.tossinvest.com/openapi-docs/latest/api-reference/README.md

## 준비

`scripts/toss_api.py` 가 자격 증명이 없다거나 IP가 거부되었다고 하면, 사용자에게 아래 순서를 안내하고 멈춘다. 자격 증명 값을 채팅으로 받지 않는다.

1. 토스증권 WTS에 로그인해 `설정 > Open API` 에서 `client_id` 와 `client_secret` 을 발급받는다.
2. 같은 메뉴의 `허용 IP 관리` 에 API를 호출할 PC의 공인 IP를 등록한다. 유동 IP는 차단된다.
3. 환경 변수 `TOSS_CLIENT_ID`, `TOSS_CLIENT_SECRET` 을 셸 프로필에 넣거나, `~/.config/toss-invest/credentials.json` 에 `{"client_id": "...", "client_secret": "..."}` 를 저장하고 권한을 `600` 으로 둔다.

스크립트가 토큰을 새로 받으면 같은 키로 받은 다른 토큰은 무효가 되므로, 사용자가 같은 키를 다른 프로그램에서 쓰면 알린다.

## 호출 방법

모든 호출은 `toss_api.py` 로 한다.

```bash
python3 <스킬 폴더>/scripts/toss_api.py <경로> [이름=값 ...] [--pages N] [--out 파일]
```

```bash
python3 <스킬 폴더>/scripts/toss_api.py /api/v1/prices symbols=005930,000660,AAPL
```

```bash
python3 <스킬 폴더>/scripts/toss_api.py /api/v1/candles symbol=005930 interval=1d count=200 --pages 5 --out <스크래치 폴더>/005930-1d.json
```

- `--pages N`: 응답의 `nextBefore`, `nextUntil` 커서를 따라 N쪽까지 받아 배열 하나로 합친다.
- `--out`: 응답을 세션의 스크래치 폴더에 파일로 저장한다. `/api/v1/stocks/all` 과 여러 쪽 캔들은 항상 이렇게 받는다.
- 날짜와 시각은 `2026-03-25T09:00:00+09:00` 처럼 인코딩하지 않고 넘긴다.

## 데이터 해석 주의

- 가격, 거래량, 금액은 문자열로 온다.
- `changeRate` 는 비율이다. `0.0179` 는 1.79%다.
- 캔들과 수급 기록은 최신순이다.
- 캔들 단위는 `1m`, `1d` 뿐이라 주봉과 월봉은 일봉을 묶어 만든다. 1분봉은 국내 2022-11-23, 미국 2021-12-01부터 있다.
- 국내 시세와 호가는 KRX와 NXT를 합친 값이다.
- 미국 시세는 NBBO가 아닌 일부 거래소 기준이고, 거래가 없던 1분봉은 빠져 있다.
- 당일 투자자별 매매동향은 잠정치다. 개인 순매수 랭킹은 장 마감 후에 확정되고, 신용거래는 T+1에 공개된다.
- 시장 지표는 `KOSPI`, `KOSDAQ`, `KR_BOND_2Y`, `KR_BOND_3Y`, `KR_BOND_5Y`, `KR_BOND_10Y`, `KR_BOND_20Y`, `KR_BOND_30Y` 8개뿐이다. 해외 지수와 업종 지수는 KIS로 받는다.
- 상장폐지 종목은 `404 stock-not-found` 로 온다.

## API 목차

모든 API는 `GET` 이고 `https://openapi.tossinvest.com` 아래에 있다. 필수 파라미터에는 `*` 를 붙였다.

### 시세

| API | 경로 | 주요 파라미터 | Rate Limit 그룹 | 문서 |
|---|---|---|---|---|
| 현재가 | `/api/v1/prices` | `symbols*` (콤마로 최대 200개) | `MARKET_DATA` | [getPrices](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketDataApi.md#getPrices) |
| 호가 | `/api/v1/orderbook` | `symbol*` | `MARKET_DATA` | [getOrderbook](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketDataApi.md#getOrderbook) |
| 최근 체결 | `/api/v1/trades` | `symbol*`, `count` (최대 50, 당일만) | `MARKET_DATA` | [getTrades](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketDataApi.md#getTrades) |
| 상한가와 하한가 | `/api/v1/price-limits` | `symbol*` (미국은 `null`) | `MARKET_DATA` | [getPriceLimit](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketDataApi.md#getPriceLimit) |
| 캔들 (OHLCV) | `/api/v1/candles` | `symbol*`, `interval*` (`1m`, `1d`), `count` (최대 200), `before`, `adjusted` (기본 `true`) | `MARKET_DATA_CHART` | [getCandles](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketDataApi.md#getCandles) |

### 종목 정보

| API | 경로 | 주요 파라미터 | Rate Limit 그룹 | 문서 |
|---|---|---|---|---|
| 종목 기본 정보 | `/api/v1/stocks` | `symbols*` (최대 200개). 종목명, 시장, 상장일, 발행주식수, 레버리지 배수 | `STOCK` | [getStocks](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/StockInfoApi.md#getStocks) |
| 마켓별 전체 종목 | `/api/v1/stocks/all` | `market*` (`KOSPI`, `KOSDAQ`, `NYSE`, `NASDAQ`, `AMEX`, `KR_ETC`, `US_ETC`), `status` (기본 `ACTIVE`), `securityType` (`STOCK`, `ETF`, `ETN`, `REIT` 등), `commonShare` | `STOCK_ALL` | [listStocks](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/StockInfoApi.md#listStocks) |
| 매수 유의사항 | `/api/v1/stocks/{symbol}/warnings` | 투자경고, 투자위험, 단기과열, 정리매매, VI 발동 | `STOCK` | [getStockWarnings](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/StockInfoApi.md#getStockWarnings) |

### 수급 동향 (국내 종목만, 일 단위)

모두 `count` (최대 100, 기본 10)와 `until` (`YYYY-MM-DD`)을 받고, 응답의 `nextUntil` 로 이전 기간을 넘긴다.

| API | 경로 | 내용 | Rate Limit 그룹 | 문서 |
|---|---|---|---|---|
| 투자자별 매매동향 | `/api/v1/stocks/{symbol}/investor-trading` | 개인, 외국인, 기관(세부 7개), 기타법인의 매수, 매도, 순매수 수량과 외국인 보유 | `STOCK_TRADING_TREND` | [getStockInvestorTrading](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/StockInfoApi.md#getStockInvestorTrading) |
| 프로그램매매 | `/api/v1/stocks/{symbol}/program-trades` | 차익, 비차익 거래량 (KRX만) | `STOCK_TRADING_TREND` | [getStockProgramTrades](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/StockInfoApi.md#getStockProgramTrades) |
| 공매도 | `/api/v1/stocks/{symbol}/short-selling` | 공매도 수량, 금액, 비중 | `STOCK_TRADING_TREND` | [getStockShortSelling](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/StockInfoApi.md#getStockShortSelling) |
| 신용거래 | `/api/v1/stocks/{symbol}/credit-trades` | 신용융자와 대주의 신규, 상환, 잔고, 비율 | `STOCK_TRADING_TREND` | [getStockCreditTrades](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/StockInfoApi.md#getStockCreditTrades) |
| 대차거래 | `/api/v1/stocks/{symbol}/securities-lending` | 대차 체결, 상환, 잔고 금액 | `STOCK_TRADING_TREND` | [getStockSecuritiesLending](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/StockInfoApi.md#getStockSecuritiesLending) |

### 시장 지표 (국내 지수와 국채)

| API | 경로 | 주요 파라미터 | Rate Limit 그룹 | 문서 |
|---|---|---|---|---|
| 지표 현재가 | `/api/v1/market-indicators/prices` | `symbols*` | `MARKET_INDICATOR` | [getMarketIndicatorPrices](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketIndicatorsApi.md#getMarketIndicatorPrices) |
| 지표 캔들 | `/api/v1/market-indicators/{symbol}/candles` | `interval*` (`1m` 은 지수만, 국채는 `1d` 만), `count` (최대 200), `before` | `MARKET_INDICATOR_CHART` | [getMarketIndicatorCandles](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketIndicatorsApi.md#getMarketIndicatorCandles) |
| 지수 투자자별 매매대금 | `/api/v1/market-indicators/{symbol}/investor-trading` | `KOSPI`, `KOSDAQ` 만. `interval*` (`1d`, `1w`, `1mo`, `1y`), `count` (최대 100), `until` | `MARKET_INDICATOR` | [getMarketIndicatorInvestorTrading](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketIndicatorsApi.md#getMarketIndicatorInvestorTrading) |

### 랭킹

| API | 경로 | 주요 파라미터 | Rate Limit 그룹 | 문서 |
|---|---|---|---|---|
| 주식 랭킹 | `/api/v1/rankings` | `type*` (`MARKET_TRADING_AMOUNT`, `MARKET_TRADING_VOLUME`, `TOP_GAINERS`, `TOP_LOSERS`, `TOSS_SECURITIES_TRADING_AMOUNT`, `TOSS_SECURITIES_TRADING_VOLUME`), `marketCountry*` (`KR`, `US`), `duration*` (`realtime`, `1d`, `1w`, `1mo`, `3mo`, `6mo`, `1y`. 상승과 하락은 `realtime` 불가), `excludeInvestmentCaution`, `count` (최대 100) | `RANKING` | [getRankings](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/RankingApi.md#getRankings) |
| 투자자별 순매수, 순매도 상위 | `/api/v1/rankings/investor-trading` | `count` (최대 100). 국내만, 최근 영업일 하루치 | `RANKING` | [getInvestorTradingRankings](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/RankingApi.md#getInvestorTradingRankings) |

### 섹터

| API | 경로 | 주요 파라미터 | Rate Limit 그룹 | 문서 |
|---|---|---|---|---|
| 섹터 목록 | `/api/v1/sectors` | 토스증권 산업 분류 전체 (깊이 0~2) | `SECTOR` | [listSectors](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/SectorApi.md#listSectors) |
| 섹터 상세 | `/api/v1/sectors/{sectorId}` | `marketCountry*`. 1일~1년 등락률 | `SECTOR` | [getSector](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/SectorApi.md#getSector) |
| 섹터 구성 주식 | `/api/v1/sectors/{sectorId}/stocks` | `marketCountry*`. 시가총액순 | `SECTOR` | [getSectorStocks](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/SectorApi.md#getSectorStocks) |
| 섹터 관련 ETF | `/api/v1/sectors/{sectorId}/etfs` | `marketCountry*` | `SECTOR` | [getSectorEtfs](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/SectorApi.md#getSectorEtfs) |
| 섹터 랭킹 | `/api/v1/sectors/rankings` | `type*` (`TOP_GAINERS`, `MARKET_TRADING_AMOUNT`), `marketCountry*`, `duration*` | `SECTOR_RANKING` | [getSectorRankings](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/SectorApi.md#getSectorRankings) |

### 환율과 장 운영

| API | 경로 | 주요 파라미터 | Rate Limit 그룹 | 문서 |
|---|---|---|---|---|
| 환율 | `/api/v1/exchange-rate` | `baseCurrency*`, `quoteCurrency*` (`KRW`, `USD`), `dateTime` (과거 시점) | `MARKET_INFO` | [getExchangeRate](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketInfoApi.md#getExchangeRate) |
| 국내 장 운영 정보 | `/api/v1/market-calendar/KR` | `date`. 3영업일치 세션 시간 | `MARKET_INFO` | [getKrMarketCalendar](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketInfoApi.md#getKrMarketCalendar) |
| 미국 장 운영 정보 | `/api/v1/market-calendar/US` | `date`. 주간, 프리, 정규, 애프터 세션 (KST) | `MARKET_INFO` | [getUsMarketCalendar](https://openapi.tossinvest.com/openapi-docs/latest/api-reference/Apis/MarketInfoApi.md#getUsMarketCalendar) |
