# Finviz (무료 화면)

## 목차
- 쓰는 방법
- 페이지
- 스크리너 주소 만들기
- 필터 코드

## 쓰는 방법

- Finviz는 미국 주식(NASDAQ, NYSE, AMEX)만 다룬다.
- 조건에 맞는 Finviz 주소를 만들어 사용자에게 링크로 준다. 사용자가 브라우저에서 직접 연다.
- Finviz 페이지를 `curl`, 스크립트, 브라우저 도구로 읽어 데이터를 뽑지 않는다.
- 링크를 줄 때는 걸어 둔 조건을 한 줄씩 우리말로 풀어 쓴다.

## 페이지

| 보는 것 | 주소 |
|---|---|
| S&P 500 섹터 히트맵 (당일) | `https://finviz.com/map?t=sec` |
| 히트맵 기간 바꾸기 | `st=w1` 1주, `st=w4` 4주, `st=ytd` 연초 대비. 예: `https://finviz.com/map?t=sec&st=w1` |
| ETF 히트맵 | `https://finviz.com/map?t=etf` |
| 섹터별 성과 (1주 수익률순) | `https://finviz.com/groups?g=sector&v=140&o=-perf1w` |
| 산업별 성과 (1주 수익률순) | `https://finviz.com/groups?g=industry&v=140&o=-perf1w` |
| 실적 발표 일정 | `https://finviz.com/calendar/earnings` |
| 경제 지표 일정 | `https://finviz.com/calendar/economic` |
| 내부자 거래 | `https://finviz.com/insidertrading` |
| 종목 상세 (차트, 재무, 뉴스, 내부자 거래) | `https://finviz.com/stock?t=AAPL` |
| 시장 뉴스 | `https://finviz.com/news` |
| 지수 선물, 원자재, 금리 선물 | `https://finviz.com/futures` |

## 스크리너 주소 만들기

```
https://finviz.com/screener/stocks?v=<화면>&f=<필터1>,<필터2>&o=<정렬>
```

- 화면 `v`: `111` 개요, `121` 밸류에이션, `131` 지분, `141` 성과, `161` 재무, `171` 기술적 지표.
- 정렬 `o`: `-change` 등락률 높은 순, `-volume` 거래량 많은 순, `-marketcap` 시가총액 큰 순. 앞의 `-` 를 빼면 오름차순이다.
- 필터는 쉼표로 이어 붙이고, 모두 만족하는 종목만 남는다.

예: S&P 500 중 P/E 15 미만이고 ROE 15% 초과인 종목을 밸류에이션 화면으로, 시가총액 큰 순으로 본다.

```
https://finviz.com/screener/stocks?v=121&f=idx_sp500,fa_pe_u15,fa_roe_o15&o=-marketcap
```

## 필터 코드

아래 표에 있는 코드만 쓴다. 맞는 코드가 없으면 비슷한 조건의 코드로 주소를 만들고, 나머지 조건은 사용자가 화면에서 직접 고르라고 안내한다. 숫자 조건 코드에서 `o` 는 초과, `u` 는 미만이다.

| 분류 | 코드 | 뜻 |
|---|---|---|
| 지수 | `idx_sp500`, `idx_ndx`, `idx_dji` | S&P 500, 나스닥 100, 다우 30 편입 종목 |
| 거래소, 국가 | `exch_nasd`, `geo_usa` | 나스닥 상장, 미국 기업 |
| 섹터 | `sec_technology`, `sec_communicationservices`, `sec_consumercyclical` | 기술, 커뮤니케이션 서비스, 경기소비재 |
| 시가총액 | `cap_mega`, `cap_largeover` | 초대형주(2천억 달러 이상), 대형주 이상 |
| 밸류에이션 | `fa_pe_u15`, `fa_fpe_u15`, `fa_peg_u1` | P/E 15 미만, 예상 P/E 15 미만, PEG 1 미만 |
| 수익성, 성장 | `fa_roe_o15`, `fa_epsqoq_o25`, `fa_salesqoq_o25` | ROE 15% 초과, 분기 EPS 성장률 25% 초과, 분기 매출 성장률 25% 초과 |
| 배당, 부채 | `fa_div_o3`, `fa_debteq_u0.5` | 배당수익률 3% 초과, 부채비율(D/E) 0.5 미만 |
| 기술적 지표 | `ta_rsi_os30`, `ta_rsi_ob70` | RSI 30 미만 과매도, RSI 70 초과 과매수 |
| 추세 | `ta_sma200_pa`, `ta_highlow52w_nh`, `ta_highlow52w_nl` | 200일 이동평균 위, 52주 신고가, 52주 신저가 |
| 거래량 | `sh_relvol_o2`, `sh_avgvol_o1000` | 상대 거래량 2배 초과, 평균 거래량 100만 주 초과 |
| 수급 | `sh_short_o20`, `sh_insidertrans_pos`, `sh_instown_o80` | 공매도 비율 20% 초과, 내부자 순매수, 기관 보유 80% 초과 |
| 애널리스트, 일정 | `an_recom_buybetter`, `earningsdate_thisweek` | 투자의견 매수 이상, 이번 주 실적 발표 |
