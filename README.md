# 머니뷰 MoneyView — AI 글로벌 마켓 대시보드

Next.js 16 (App Router) + Tailwind CSS v4 · 모바일/웹 반응형

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

데모 계정: `demo` / `demo1234!`

## 화면

| 경로 | 내용 |
| --- | --- |
| `/login` | 로그인 (아이디·비밀번호, 로그인 상태 유지, 데모 계정) |
| `/signup` | 회원가입 — 이름·전화번호·메일·아이디·비밀번호·비밀번호 확인, 개인정보 수집(필수)·제3자 마케팅 수신(선택) 동의 |
| `/dashboard` | AI 데일리 브리핑, 글로벌 투자심리 게이지, 실시간 시세, **대륙별(미국/유럽/아시아/아프리카) 실시간 이슈 키워드 순위**, 증시 영향 AI 분석, 섹터×대륙 히트맵, 주목 일정 |
| `/issue/[id]` | 키워드 클릭 시 이동 — 기사 원문 대신 **AI 요약 리포트** (3줄 요약, 체크 포인트, 섹터 영향, 시나리오, 영향 점수, 관련 종목) |
| `/market` | 국내 전 종목(코스피·코스닥) — 검색, 시가총액·거래대금·급상승 정렬, ETF 필터, ☆관심종목, 1초 실시간 |
| `/stock/[code]` | 종목 상세 — 실시간 가격, 1일~5년 차트(마우스로 가격 확인), 오늘·52주 범위, 시세 정보, 기업 개요, 관련 뉴스 |
| `/reports` | 대륙별 AI 시황 리포트 + 전체 이슈 분석 |
| `/me` | 내 정보, 동의 내역·마케팅 수신 철회 |

상단 고정 **글로벌 핫 키워드** 띠가 모든 화면에 표시됩니다.

## 실데이터 연결 (무료 모드 · API 키 없이 바로 동작)

| 데이터 | 출처 | 갱신 | 파일 |
| --- | --- | --- | --- |
| 이슈 키워드·요약 | 구글 뉴스 RSS(대륙별 검색) · 연합뉴스 · 한국경제 RSS | 5분 | `src/lib/live/news.ts`, `rss.ts` |
| 증시 영향 점수 | 기사 제목의 긍정·부정 표현 + 키워드 사전 | 5분 | `src/lib/live/dict.ts` |
| 국내 시세 | 네이버 금융 실시간(코스피·코스닥·삼성전자·SK하이닉스) | 10초 | `src/lib/live/quotes.ts` |
| 국내 전 종목 | 네이버 금융 종목 목록(60초) + 화면에 보이는 종목 실시간(1초) · 분봉/일봉 차트 | 1초 | `src/lib/live/stocks.ts` |
| 관심종목 | 회원별로 브라우저 localStorage 저장 (Supabase 연결 후 watchlist 테이블로 이전) | — | `src/lib/favorites.ts` |
| 해외 시세 | Yahoo Finance 차트(해외지수·환율·원자재, 15~20분 지연) | 10초 | `src/lib/live/quotes.ts` |
| 캐시 | 서버 메모리 (DB 없음, 재시작 시 초기화) | — | `src/lib/live/store.ts` |

- 비용 0원: 유료 API·AI 호출 없음. "AI 요약"은 규칙 기반 자동 요약입니다.
- 기사 본문은 저장하지 않고 **제목·언론사·링크만** 사용, 상세 페이지에 원문 링크를 표시합니다.
- 수집 실패 시 자동으로 데모 데이터(`src/lib/issues.ts`, `market.ts`)로 대체됩니다.
- 네이버·Yahoo 시세 모두 비공식 공개 엔드포인트라 학습·테스트용입니다. (Yahoo의 국내 시세는 약 20분 지연 + 코스닥 전일 종가 오류가 있어 국내는 네이버 사용) 출시 시 공공데이터포털/KIS로 교체하세요.
- 키워드 품질을 높이려면 `dict.ts`의 `TERMS`(키워드 사전)와 `STOP`(제외어)을 늘리면 됩니다.

## 다음 단계 (커리큘럼 순서)

- 교시 3~4: Supabase(무료 플랜) 연결 → 수집 결과·회원 정보 저장 (`src/components/providers.tsx` 교체)
- 교시 6: AI API 연결 시 실제 AI 요약 (유료 — 무료 모드에서는 생략)

## 배포 (Cloudflare Workers 무료 플랜)

```bash
npx wrangler login   # 처음 한 번, 브라우저에서 Cloudflare 로그인
npm run deploy       # 빌드 + 배포 → https://moneyview.<계정>.workers.dev
npm run preview      # 배포 전 Workers 환경으로 로컬 확인 (http://localhost:8787)
```

- 어댑터: `@opennextjs/cloudflare` (설정: `wrangler.jsonc`, `open-next.config.ts`)
- 무료 유지를 위해 R2·KV·Images 바인딩은 쓰지 않습니다.
- Workers에서는 아직 Cache Components가 지원되지 않아 `cacheComponents`를 꺼 두었습니다.
- Workers는 요청 사이에 Promise를 공유할 수 없어서, 동시 요청 정리는 `src/lib/live/once.ts`의 '갱신 중' 표시로 합니다.
- 무료 플랜은 하루 요청 10만 건까지입니다. 화면이 1초마다 시세를 요청하므로, 탭 하나를 계속 열어 두면 시간당 수천 건이 쓰입니다.
