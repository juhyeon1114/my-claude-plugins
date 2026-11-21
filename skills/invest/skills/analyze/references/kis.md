# 한국투자증권(KIS) Open API

## 목차
- 참고 문서
- 준비
- 호출 방법
- 자주 쓰는 코드
- 데이터 해석 주의
- API 목차

## 참고 문서

목차에 있는 API의 파라미터 값이나 응답 필드 뜻이 필요할 때만 읽는다.

- 개발자 포털: https://apiportal.koreainvestment.com
- 공식 예제: https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm
- 목차의 예제 링크는 API별 폴더다. `<이름>.py` 에 파라미터 설명이, `chk_<이름>.py` 에 응답 필드의 한글 이름이 있다.

## 준비

`kis_api.py` 가 자격 증명이 없다고 하면, 사용자에게 아래 순서를 안내하고 멈춘다. 자격 증명 값을 채팅으로 받지 않는다.

1. 한국투자증권 계좌를 열고, KIS Developers에서 Open API를 신청해 실전투자용 App Key와 App Secret을 발급받는다.
2. `~/.claude/.env` 에 `KIS_APP_KEY=...`, `KIS_APP_SECRET=...` 를 넣는다. 셸 환경 변수로 넣거나 `~/.config/kis/credentials.json` 에 `{"app_key": "...", "app_secret": "..."}` 를 저장해도 된다. 파일 권한은 `600` 으로 둔다.

토큰은 1분에 한 번만 발급되고 발급할 때마다 사용자에게 알림톡이 가므로, 스크립트가 캐시한 토큰(`~/.cache/kis/token.json`)을 지우지 않는다.

## 호출 방법

모든 호출은 `kis_api.py` 로 한다. `tr_id` 와 넘기지 않은 파라미터의 기본값은 `scripts/kis_endpoints.json` 에서 채운다.

```bash
python3 <스킬 폴더>/scripts/kis_api.py <경로> [이름=값 ...] [--pages N] [--out 파일]
```

```bash
python3 <스킬 폴더>/scripts/kis_api.py /uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice FID_INPUT_ISCD=005930 FID_INPUT_DATE_1=20260801 FID_INPUT_DATE_2=20261120 --out <스크래치 폴더>/005930-kis-1d.json
```

```bash
python3 <스킬 폴더>/scripts/kis_api.py /uapi/overseas-price/v1/quotations/inquire-daily-chartprice FID_COND_MRKT_DIV_CODE=N FID_INPUT_ISCD=SPX FID_INPUT_DATE_1=20260101 FID_INPUT_DATE_2=20261120
```

- 파라미터 이름은 대소문자를 가리지 않는다. 경로에 없는 이름을 넘기면 스크립트가 쓸 수 있는 이름을 알려준다.
- `--pages N`: 응답 헤더 `tr_cont` 가 다음 쪽이 있다고 하면 N쪽까지 이어 받는다.
- 기간별 시세는 한 번에 100개까지 온다. 더 긴 기간은 종료일을 앞당겨 가며 여러 번 받는다.
- 날짜는 `YYYYMMDD`, 시각은 `HHMMSS` 로 넘긴다.

## 자주 쓰는 코드

| 대상 | 파라미터 | 값 |
|---|---|---|
| 국내 시장 | `FID_COND_MRKT_DIV_CODE` | `J` KRX (기본값), `NX` NXT, `UN` 통합, `U` 업종 |
| 국내 업종과 지수 | `FID_INPUT_ISCD` | `0001` 코스피, `1001` 코스닥, `2001` 코스피200 |
| 국내 순위의 대상 범위 | `FID_INPUT_ISCD` | `0000` 전체 (기본값), `0001` 거래소, `1001` 코스닥, `2001` 코스피200 |
| 해외 거래소 | `EXCD` | `NAS` 나스닥, `NYS` 뉴욕, `AMS` 아멕스 |
| 해외 지수 (`FID_COND_MRKT_DIV_CODE=N`) | `FID_INPUT_ISCD` | `.DJI` 다우, `SPX` S&P 500, `COMP` 나스닥 종합, `NDX` 나스닥 100, `SOX` 필라델피아 반도체, `VIX` |
| 환율 (`FID_COND_MRKT_DIV_CODE=X`) | `FID_INPUT_ISCD` | `FX@KRW` 원달러 |
| 해외 순위 기간 | `NDAY` | `0` 당일, `3` 5일, `5` 20일, `7` 60일, `9` 1년 |

다른 지수와 환율 코드는 KIS 해외 종목 마스터(`https://new.real.download.dws.co.kr/common/master/frgn_code.mst.zip`, cp949)의 심볼을 쓴다. 첫 글자는 구분 코드라 빼고 넘긴다.

## 데이터 해석 주의

- 숫자는 모두 문자열로 온다.
- 결과는 `output`, `output1`, `output2` 에 나뉘어 온다. 기간별 시세는 보통 `output1` 이 요약, `output2` 가 날짜별 배열이다.
- 응답 필드는 `stck_prpr`(현재가), `prdy_ctrt`(전일 대비율)처럼 약어다. 뜻은 예제 폴더의 `chk_<이름>.py` 에서 찾는다.
- 국내 재무분석 API(대차대조표, 손익계산서, 재무비율 등)는 2026-11-11에 종료되어 목차에 없다. 현재가의 PER, PBR, EPS와 시장가치 순위, 추정실적은 쓸 수 있다.
- 해외 지수 기간별 시세 API로 미국 종목을 조회하면 다우30, 나스닥100, S&P 500 종목만 나온다. 다른 종목은 해외 기간별 시세를 쓴다.

## API 목차

모든 API는 `GET` 이고 `https://openapi.koreainvestment.com:9443` 아래에 있다. "넘길 값" 에 없는 파라미터는 기본값으로 둔다.

### 국내 시세

| API | 경로 | 넘길 값 | 예제 |
|---|---|---|---|
| 현재가 (PER, PBR, 시가총액, 외국인 소진율 포함) | `/uapi/domestic-stock/v1/quotations/inquire-price` | `FID_INPUT_ISCD` 종목코드 | [inquire_price](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_price) |
| 현재가 시세2 | `/uapi/domestic-stock/v1/quotations/inquire-price-2` | `FID_INPUT_ISCD` | [inquire_price_2](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_price_2) |
| 호가와 예상체결 | `/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn` | `FID_INPUT_ISCD` | [inquire_asking_price_exp_ccn](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_asking_price_exp_ccn) |
| 체결 | `/uapi/domestic-stock/v1/quotations/inquire-ccnl` | `FID_INPUT_ISCD` | [inquire_ccnl](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_ccnl) |
| 최근 30일, 30주, 30개월 시세 | `/uapi/domestic-stock/v1/quotations/inquire-daily-price` | `FID_INPUT_ISCD`, `FID_PERIOD_DIV_CODE` (`D`, `W`, `M`) | [inquire_daily_price](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_daily_price) |
| 기간별 시세 (일, 주, 월, 년봉) | `/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice` | `FID_INPUT_ISCD`, `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2`, `FID_PERIOD_DIV_CODE` (`D`, `W`, `M`, `Y`). 기본값은 수정주가 | [inquire_daily_itemchartprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_daily_itemchartprice) |
| 당일 분봉 | `/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice` | `FID_INPUT_ISCD`, `FID_INPUT_HOUR_1` (이 시각 이전 30개) | [inquire_time_itemchartprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_time_itemchartprice) |
| 일별 분봉 (과거 일자) | `/uapi/domestic-stock/v1/quotations/inquire-time-dailychartprice` | `FID_INPUT_ISCD`, `FID_INPUT_DATE_1`, `FID_INPUT_HOUR_1` | [inquire_time_dailychartprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_time_dailychartprice) |
| 여러 종목 시세 (최대 30개) | `/uapi/domestic-stock/v1/quotations/intstock-multprice` | `FID_COND_MRKT_DIV_CODE_n=J`, `FID_INPUT_ISCD_n` (n은 1~30) | [intstock_multprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/intstock_multprice) |
| VI 발동 현황 | `/uapi/domestic-stock/v1/quotations/inquire-vi-status` | `FID_INPUT_DATE_1` 영업일, `FID_INPUT_ISCD` (빈 값이면 전체) | [inquire_vi_status](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_vi_status) |
| 증권사별 매매 상위 | `/uapi/domestic-stock/v1/quotations/inquire-member` | `FID_INPUT_ISCD` | [inquire_member](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_member) |

### 국내 수급

| API | 경로 | 넘길 값 | 예제 |
|---|---|---|---|
| 종목 투자자별 매매 (최근 일자) | `/uapi/domestic-stock/v1/quotations/inquire-investor` | `FID_INPUT_ISCD` | [inquire_investor](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_investor) |
| 종목별 투자자 매매동향 (일별) | `/uapi/domestic-stock/v1/quotations/investor-trade-by-stock-daily` | `FID_INPUT_ISCD`, `FID_INPUT_DATE_1` | [investor_trade_by_stock_daily](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/investor_trade_by_stock_daily) |
| 종목별 외국인, 기관 장중 추정 | `/uapi/domestic-stock/v1/quotations/investor-trend-estimate` | `MKSC_SHRN_ISCD` 종목코드 | [investor_trend_estimate](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/investor_trend_estimate) |
| 시장별 투자자 매매동향 (일별) | `/uapi/domestic-stock/v1/quotations/inquire-investor-daily-by-market` | `FID_INPUT_ISCD=0001`, `FID_INPUT_ISCD_1` (`KSP` 코스피, `KSQ` 코스닥), `FID_INPUT_ISCD_2` 업종코드, `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2` (같은 날짜) | [inquire_investor_daily_by_market](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_investor_daily_by_market) |
| 시장별 투자자 매매동향 (장중) | `/uapi/domestic-stock/v1/quotations/inquire-investor-time-by-market` | 기본값 그대로. 다른 시장은 예제 참고 | [inquire_investor_time_by_market](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_investor_time_by_market) |
| 외국인, 기관 매매 종목 가집계 | `/uapi/domestic-stock/v1/quotations/foreign-institution-total` | `FID_INPUT_ISCD` (`0000`, `0001`, `1001`), `FID_DIV_CLS_CODE` (`0` 수량, `1` 금액), `FID_RANK_SORT_CLS_CODE` (`0` 순매수, `1` 순매도), `FID_ETC_CLS_CODE` (`0` 전체, `1` 외국인, `2` 기관) | [foreign_institution_total](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/foreign_institution_total) |
| 외국계 증권사 매매 가집계 | `/uapi/domestic-stock/v1/quotations/frgnmem-trade-estimate` | `FID_RANK_SORT_CLS_CODE` (`0` 금액, `1` 수량), `FID_RANK_SORT_CLS_CODE_2` (`0` 매수, `1` 매도) | [frgnmem_trade_estimate](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/frgnmem_trade_estimate) |
| 종목별 프로그램매매 (체결) | `/uapi/domestic-stock/v1/quotations/program-trade-by-stock` | `FID_INPUT_ISCD` | [program_trade_by_stock](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/program_trade_by_stock) |
| 종목별 프로그램매매 (일별) | `/uapi/domestic-stock/v1/quotations/program-trade-by-stock-daily` | `FID_INPUT_ISCD`, `FID_INPUT_DATE_1` | [program_trade_by_stock_daily](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/program_trade_by_stock_daily) |
| 프로그램매매 종합 (일별) | `/uapi/domestic-stock/v1/quotations/comp-program-trade-daily` | `FID_MRKT_CLS_CODE` (`K` 코스피, `Q` 코스닥), `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2` | [comp_program_trade_daily](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/comp_program_trade_daily) |
| 프로그램매매 투자자별 (당일) | `/uapi/domestic-stock/v1/quotations/investor-program-trade-today` | `MRKT_DIV_CLS_CODE` (`1` 코스피, `4` 코스닥) | [investor_program_trade_today](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/investor_program_trade_today) |
| 공매도 일별 추이 | `/uapi/domestic-stock/v1/quotations/daily-short-sale` | `FID_INPUT_ISCD`, `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2` | [daily_short_sale](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/daily_short_sale) |
| 신용잔고 일별 추이 | `/uapi/domestic-stock/v1/quotations/daily-credit-balance` | `FID_INPUT_ISCD`, `FID_INPUT_DATE_1` 결제일자 | [daily_credit_balance](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/daily_credit_balance) |
| 대차거래 일별 추이 | `/uapi/domestic-stock/v1/quotations/daily-loan-trans` | `MRKT_DIV_CLS_CODE` (`1` 코스피, `2` 코스닥, `3` 종목), `MKSC_SHRN_ISCD`, `START_DATE`, `END_DATE` | [daily_loan_trans](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/daily_loan_trans) |

### 국내 업종과 지수

| API | 경로 | 넘길 값 | 예제 |
|---|---|---|---|
| 업종 현재 지수 | `/uapi/domestic-stock/v1/quotations/inquire-index-price` | `FID_INPUT_ISCD` | [inquire_index_price](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_index_price) |
| 업종 일자별 지수 | `/uapi/domestic-stock/v1/quotations/inquire-index-daily-price` | `FID_INPUT_ISCD`, `FID_PERIOD_DIV_CODE` (`D`, `W`, `M`), `FID_INPUT_DATE_1` | [inquire_index_daily_price](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_index_daily_price) |
| 업종 기간별 시세 | `/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice` | `FID_INPUT_ISCD`, `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2`, `FID_PERIOD_DIV_CODE` (`D`, `W`, `M`, `Y`) | [inquire_daily_indexchartprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_daily_indexchartprice) |
| 업종 분봉 | `/uapi/domestic-stock/v1/quotations/inquire-time-indexchartprice` | `FID_INPUT_ISCD`, `FID_INPUT_HOUR_1` (간격 초: `30`, `60`, `600`, `3600`) | [inquire_time_indexchartprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_time_indexchartprice) |
| 업종 구분별 전체 시세 | `/uapi/domestic-stock/v1/quotations/inquire-index-category-price` | `FID_INPUT_ISCD`, `FID_MRKT_CLS_CODE` (`K` 거래소, `Q` 코스닥, `K2` 코스피200) | [inquire_index_category_price](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_index_category_price) |

### 국내 순위

기본값은 시장 전체, 모든 가격과 거래량 대상이다.

| API | 경로 | 넘길 값 | 예제 |
|---|---|---|---|
| 등락률 | `/uapi/domestic-stock/v1/ranking/fluctuation` | `FID_RANK_SORT_CLS_CODE` (정렬은 예제 참고), `FID_RSFL_RATE1`, `FID_RSFL_RATE2` (등락률 범위) | [fluctuation](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/fluctuation) |
| 거래량 | `/uapi/domestic-stock/v1/quotations/volume-rank` | `FID_BLNG_CLS_CODE` (`0` 평균거래량, `1` 거래증가율, `2` 평균거래회전율, `3` 거래금액순) | [volume_rank](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/volume_rank) |
| 시가총액 | `/uapi/domestic-stock/v1/ranking/market-cap` | `FID_DIV_CLS_CODE` (`0` 전체, `1` 보통주, `2` 우선주) | [market_cap](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/market_cap) |
| 시장가치 (PER, PBR 등) | `/uapi/domestic-stock/v1/ranking/market-value` | `FID_RANK_SORT_CLS_CODE` (`23` PER, `24` PBR, `25` PCR, `26` PSR, `27` EPS, `30` EV/EBITDA), `FID_INPUT_OPTION_1` 회계연도, `FID_INPUT_OPTION_2` (`0` 1분기, `1` 반기, `2` 3분기, `3` 결산) | [market_value](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/market_value) |
| 수익자산지표 | `/uapi/domestic-stock/v1/ranking/profit-asset-index` | `FID_INPUT_OPTION_1`, `FID_INPUT_OPTION_2`, `FID_RANK_SORT_CLS_CODE` (예제 참고) | [profit_asset_index](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/profit_asset_index) |
| 신고가, 신저가 근접 | `/uapi/domestic-stock/v1/ranking/near-new-highlow` | `FID_PRC_CLS_CODE` (`0` 신고가 근접, `1` 신저가 근접), `FID_INPUT_CNT_1`, `FID_INPUT_CNT_2` (괴리율 범위) | [near_new_highlow](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/near_new_highlow) |
| 신용잔고 상위 | `/uapi/domestic-stock/v1/ranking/credit-balance` | `FID_RANK_SORT_CLS_CODE` (`0` 융자 잔고비율, `3` 융자 잔고비율 증가, `5` 대주 잔고비율) | [credit_balance](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/credit_balance) |
| 공매도 상위 | `/uapi/domestic-stock/v1/ranking/short-sale` | `FID_PERIOD_DIV_CODE` (`D`, `M`), `FID_INPUT_CNT_1` (`D` 일 때 `0` 1일, `4` 1주, `9` 2주. `M` 일 때 `1` 1개월, `3` 3개월) | [short_sale](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/short_sale) |
| 이격도 | `/uapi/domestic-stock/v1/ranking/disparity` | `FID_HOUR_CLS_CODE` (`5`, `10`, `20`, `60`, `120` 일), `FID_RANK_SORT_CLS_CODE` (`0` 상위, `1` 하위) | [disparity](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/disparity) |
| 배당률 상위 | `/uapi/domestic-stock/v1/ranking/dividend-rate` | `F_DT`, `T_DT`, `GB1` (`0` 전체, `1` 코스피, `3` 코스닥). 기본값은 현금배당 | [dividend_rate](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/dividend_rate) |
| 체결강도 상위 | `/uapi/domestic-stock/v1/ranking/volume-power` | 없음 | [volume_power](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/volume_power) |
| 대량체결 건수 상위 | `/uapi/domestic-stock/v1/ranking/bulk-trans-num` | `FID_RANK_SORT_CLS_CODE` (`0` 매수, `1` 매도) | [bulk_trans_num](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/bulk_trans_num) |
| 관심종목 등록 상위 | `/uapi/domestic-stock/v1/ranking/top-interest-stock` | 없음 | [top_interest_stock](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/top_interest_stock) |
| HTS 조회 상위 20 | `/uapi/domestic-stock/v1/ranking/hts-top-view` | 없음 | [hts_top_view](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/hts_top_view) |

### 국내 종목 정보와 기타

| API | 경로 | 넘길 값 | 예제 |
|---|---|---|---|
| 주식 기본 정보 | `/uapi/domestic-stock/v1/quotations/search-stock-info` | `PDNO` 종목코드 | [search_stock_info](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/search_stock_info) |
| 상품 기본 정보 | `/uapi/domestic-stock/v1/quotations/search-info` | `PDNO` | [search_info](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/search_info) |
| 추정실적 | `/uapi/domestic-stock/v1/quotations/estimate-perform` | `SHT_CD` 종목코드 | [estimate_perform](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/estimate_perform) |
| 종목 투자의견 | `/uapi/domestic-stock/v1/quotations/invest-opinion` | `FID_INPUT_ISCD`, `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2` | [invest_opinion](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/invest_opinion) |
| 증권사별 투자의견 | `/uapi/domestic-stock/v1/quotations/invest-opbysec` | `FID_INPUT_ISCD` 회원사 코드, `FID_DIV_CLS_CODE` (`0` 전체, `1` 매수, `2` 중립, `3` 매도), `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2` | [invest_opbysec](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/invest_opbysec) |
| 배당 일정 | `/uapi/domestic-stock/v1/ksdinfo/dividend` | `F_DT`, `T_DT`, `SHT_CD` (빈 값이면 전체) | [ksdinfo_dividend](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/ksdinfo_dividend) |
| 시황, 공시 제목 | `/uapi/domestic-stock/v1/quotations/news-title` | `FID_INPUT_ISCD` (빈 값이면 전체), `FID_INPUT_DATE_1` | [news_title](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/news_title) |
| 휴장일 | `/uapi/domestic-stock/v1/quotations/chk-holiday` | `BASS_DT` 기준일 | [chk_holiday](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/chk_holiday) |
| 금리 종합 (국내 채권 금리) | `/uapi/domestic-stock/v1/quotations/comp-interest` | 없음 | [comp_interest](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/comp_interest) |
| 증시자금 종합 | `/uapi/domestic-stock/v1/quotations/mktfunds` | `FID_INPUT_DATE_1` (빈 값이면 최근) | [mktfunds](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/mktfunds) |

### 해외 시세

| API | 경로 | 넘길 값 | 예제 |
|---|---|---|---|
| 현재 체결가 | `/uapi/overseas-price/v1/quotations/price` | `EXCD`, `SYMB` 티커 | [price](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/price) |
| 현재가 상세 (PER, PBR, 시가총액, 52주 고저) | `/uapi/overseas-price/v1/quotations/price-detail` | `EXCD`, `SYMB` | [price_detail](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/price_detail) |
| 1호가 | `/uapi/overseas-price/v1/quotations/inquire-asking-price` | `EXCD`, `SYMB` | [inquire_asking_price](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/inquire_asking_price) |
| 기간별 시세 | `/uapi/overseas-price/v1/quotations/dailyprice` | `EXCD`, `SYMB`, `GUBN` (`0` 일, `1` 주, `2` 월), `BYMD` 기준일 (빈 값이면 오늘) | [dailyprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/dailyprice) |
| 분봉 | `/uapi/overseas-price/v1/quotations/inquire-time-itemchartprice` | `EXCD`, `SYMB`, `NMIN` 분 간격, `NREC` (최대 120). 다음 쪽은 예제 참고 | [inquire_time_itemchartprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/inquire_time_itemchartprice) |
| 상품 기본 정보 | `/uapi/overseas-price/v1/quotations/search-info` | `PDNO` 티커, `PRDT_TYPE_CD` (`512` 나스닥, `513` 뉴욕, `529` 아멕스) | [search_info](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/search_info) |
| 지수, 환율, 국채 기간별 시세 | `/uapi/overseas-price/v1/quotations/inquire-daily-chartprice` | `FID_COND_MRKT_DIV_CODE` (`N` 지수, `X` 환율, `I` 국채, `S` 금선물), `FID_INPUT_ISCD`, `FID_INPUT_DATE_1`, `FID_INPUT_DATE_2`, `FID_PERIOD_DIV_CODE` (`D`, `W`, `M`, `Y`) | [inquire_daily_chartprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/inquire_daily_chartprice) |
| 지수 분봉 | `/uapi/overseas-price/v1/quotations/inquire-time-indexchartprice` | `FID_COND_MRKT_DIV_CODE` (`N` 지수, `X` 환율), `FID_INPUT_ISCD`, `FID_HOUR_CLS_CODE` (`0` 정규장, `1` 시간외) | [inquire_time_indexchartprice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/inquire_time_indexchartprice) |

### 해외 순위와 검색

모두 `EXCD` 가 필요하다. `VOL_RANG` 기본값은 거래량 조건 없음이다.

| API | 경로 | 넘길 값 | 예제 |
|---|---|---|---|
| 상승률, 하락률 | `/uapi/overseas-stock/v1/ranking/updown-rate` | `GUBN` (`1` 상승, `0` 하락), `NDAY` | [updown_rate](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/updown_rate) |
| 가격 급등락 | `/uapi/overseas-stock/v1/ranking/price-fluct` | `GUBN` (`1` 급등, `0` 급락), `MINX` (`0` 1분 전 ~ `9` 120분 전) | [price_fluct](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/price_fluct) |
| 거래량 급증 | `/uapi/overseas-stock/v1/ranking/volume-surge` | `MINX` | [volume_surge](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/volume_surge) |
| 거래량 | `/uapi/overseas-stock/v1/ranking/trade-vol` | `NDAY` | [trade_vol](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/trade_vol) |
| 거래대금 | `/uapi/overseas-stock/v1/ranking/trade-pbmn` | `NDAY` | [trade_pbmn](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/trade_pbmn) |
| 거래증가율 | `/uapi/overseas-stock/v1/ranking/trade-growth` | `NDAY` | [trade_growth](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/trade_growth) |
| 거래회전율 | `/uapi/overseas-stock/v1/ranking/trade-turnover` | `NDAY` | [trade_turnover](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/trade_turnover) |
| 시가총액 | `/uapi/overseas-stock/v1/ranking/market-cap` | 없음 | [market_cap](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/market_cap) |
| 신고가, 신저가 | `/uapi/overseas-stock/v1/ranking/new-highlow` | `GUBN` (`1` 신고, `0` 신저), `GUBN2` (`1` 돌파 유지, `0` 일시 돌파), `MINX` | [new_highlow](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/new_highlow) |
| 매수 체결강도 상위 | `/uapi/overseas-stock/v1/ranking/volume-power` | `NDAY` | [volume_power](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/volume_power) |
| 조건 검색 | `/uapi/overseas-price/v1/quotations/inquire-search` | 쓸 조건마다 `CO_YN_<항목>=1`, `CO_ST_<항목>`, `CO_EN_<항목>`. 항목은 `PRICECUR` 현재가, `RATE` 등락률, `VALX` 시가총액(천), `SHAR` 발행주식, `VOLUME`, `AMT` 거래대금, `EPS`, `PER` | [inquire_search](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/inquire_search) |
| 업종 코드 목록 | `/uapi/overseas-price/v1/quotations/industry-price` | `EXCD` | [industry_price](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/industry_price) |
| 업종별 시세 | `/uapi/overseas-price/v1/quotations/industry-theme` | `EXCD`, `ICOD` 업종 코드 | [industry_theme](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/industry_theme) |

### 해외 뉴스와 일정

| API | 경로 | 넘길 값 | 예제 |
|---|---|---|---|
| 해외 뉴스 제목 | `/uapi/overseas-price/v1/quotations/news-title` | `NATION_CD` (`US`, 빈 값이면 전체), `SYMB` (빈 값이면 전체) | [news_title](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/news_title) |
| 해외 속보 제목 | `/uapi/overseas-price/v1/quotations/brknews-title` | 없음 | [brknews_title](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/brknews_title) |
| 해외 결제일자 (휴장일) | `/uapi/overseas-stock/v1/quotations/countries-holiday` | `TRAD_DT` 기준일 | [countries_holiday](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/countries_holiday) |
| 기간별 권리 (배당, 분할 등) | `/uapi/overseas-price/v1/quotations/period-rights` | `RGHT_TYPE_CD` (`%%` 전체, `03` 배당, `14` 액면분할), `INQR_DVSN_CD` (`02` 현지기준일), `INQR_STRT_DT`, `INQR_END_DT` | [period_rights](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/period_rights) |
| 종목 권리 종합 | `/uapi/overseas-price/v1/quotations/rights-by-ice` | `NCOD` (`US`), `SYMB` | [rights_by_ice](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/rights_by_ice) |
