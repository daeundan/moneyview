import "server-only";
import type { Quote } from "../market";
import type { Region } from "../issues";

/* =========================================================
   시세 (무료 · 키 불필요)
   - 국내(코스피·코스닥·종목): 네이버 금융 실시간 시세 → 현재가·등락률
     (Yahoo는 국내 시세가 약 20분 늦고 코스닥 전일 종가가 틀리게 나와서 교체)
   - 해외 지수·환율·원자재: Yahoo Finance 차트 (15~20분 지연)
   - 미니 차트(hist)는 Yahoo 장중 데이터 + 마지막 점을 실시간 가격으로 보정
   ※ 둘 다 비공식 공개 엔드포인트라 학습·테스트용으로만 쓰세요.
     서비스 출시 때는 공공데이터포털(전일 종가)이나 한국투자증권 KIS(실시간)로 교체.
   ========================================================= */

const LIST: { id: string; sym: string; naver?: string; name: string; region: Region | "global"; digits: number; prefix?: string }[] = [
  { id: "KOSPI", sym: "^KS11", naver: "index/KOSPI", name: "코스피", region: "asia", digits: 2 },
  { id: "KOSDAQ", sym: "^KQ11", naver: "index/KOSDAQ", name: "코스닥", region: "asia", digits: 2 },
  { id: "SEC", sym: "005930.KS", naver: "stock/005930", name: "삼성전자", region: "asia", digits: 0 },
  { id: "HYNIX", sym: "000660.KS", naver: "stock/000660", name: "SK하이닉스", region: "asia", digits: 0 },
  { id: "USDKRW", sym: "KRW=X", name: "원/달러", region: "global", digits: 2 },
  { id: "SPX", sym: "^GSPC", name: "S&P 500", region: "us", digits: 2 },
  { id: "IXIC", sym: "^IXIC", name: "나스닥", region: "us", digits: 2 },
  { id: "DJI", sym: "^DJI", name: "다우존스", region: "us", digits: 2 },
  { id: "SX5E", sym: "^STOXX50E", name: "유로스톡스50", region: "eu", digits: 2 },
  { id: "DAX", sym: "^GDAXI", name: "독일 DAX", region: "eu", digits: 2 },
  { id: "UKX", sym: "^FTSE", name: "영국 FTSE100", region: "eu", digits: 2 },
  { id: "N225", sym: "^N225", name: "닛케이225", region: "asia", digits: 2 },
  { id: "HSI", sym: "^HSI", name: "항셍", region: "asia", digits: 2 },
  { id: "SHCOMP", sym: "000001.SS", name: "상하이종합", region: "asia", digits: 2 },
  { id: "JSE", sym: "^J203.JO", name: "남아공 JSE", region: "africa", digits: 2 },
  { id: "EGX30", sym: "^CASE30", name: "이집트 EGX30", region: "africa", digits: 2 },
  { id: "GOLD", sym: "GC=F", name: "금", region: "global", digits: 1, prefix: "$" },
  { id: "WTI", sym: "CL=F", name: "WTI 유가", region: "global", digits: 2, prefix: "$" },
  { id: "BTC", sym: "BTC-USD", name: "비트코인", region: "global", digits: 0, prefix: "$" },
];

export type Tick = { price: number; prev: number; diff: number; at: number };

/** 네이버 금융 실시간 시세 (여러 종목 한 번에) → id별 { price, prev } · 등락 코드 1·2 상승, 4·5 하락 */
async function naverBatch(kind: "index" | "stock", items: (typeof LIST)[number][]): Promise<[string, Tick][]> {
  if (!items.length) return [];
  try {
    const codes = items.map((x) => x.naver!.split("/")[1]).join(",");
    const res = await fetch(`https://polling.finance.naver.com/api/realtime/domestic/${kind}/${codes}`, {
      headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(3000), cache: "no-store",
    });
    if (!res.ok) return [];
    const datas: Record<string, unknown>[] = (await res.json())?.datas ?? [];
    const num = (v: unknown) => Number(String(v).replace(/,/g, ""));
    return datas.flatMap((d) => {
      const it = items.find((x) => x.naver!.endsWith("/" + d.itemCode));
      const price = num(d.closePrice);
      const abs = Math.abs(num(d.compareToPreviousClosePrice));
      const code = String((d.compareToPreviousPrice as { code?: string })?.code ?? "3");
      const sign = code === "1" || code === "2" ? 1 : code === "4" || code === "5" ? -1 : 0;
      if (!it || !price || Number.isNaN(abs)) return [];
      return [[it.id, { price, prev: price - sign * abs, diff: sign * abs, at: Date.parse(String(d.localTradedAt)) || Date.now() }] as [string, Tick]];
    });
  } catch {
    return [];
  }
}

/** 국내 실시간 (요청 2번: 지수 묶음 + 종목 묶음) */
export async function fetchDomestic(): Promise<Map<string, Tick>> {
  const dom = LIST.filter((x) => x.naver);
  const [a, b] = await Promise.all([
    naverBatch("index", dom.filter((x) => x.naver!.startsWith("index/"))),
    naverBatch("stock", dom.filter((x) => x.naver!.startsWith("stock/"))),
  ]);
  return new Map([...a, ...b]);
}

type ChartMeta = { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketTime?: number };

async function yahoo(it: (typeof LIST)[number]): Promise<(Quote & { asOf: number }) | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(it.sym)}?range=1d&interval=15m`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (!res.ok) return null;
    const r = (await res.json())?.chart?.result?.[0];
    const meta: ChartMeta = r?.meta ?? {};
    const price = meta.regularMarketPrice;
    const prev = meta.previousClose ?? meta.chartPreviousClose;
    if (!price || !prev) return null;
    const closes: number[] = (r?.indicators?.quote?.[0]?.close ?? []).filter((v: number | null) => typeof v === "number");
    const hist = closes.length >= 2 ? closes.slice(-40) : [prev, price];
    return { id: it.id, name: it.name, region: it.region, digits: it.digits, prefix: it.prefix, base: prev, price, change: (price / prev - 1) * 100, hist, asOf: (meta.regularMarketTime ?? 0) * 1000 };
  } catch {
    return null;
  }
}

/** 전체 종목 Yahoo 데이터 (해외 시세 + 국내 미니 차트용) */
export async function fetchYahoo() {
  const rows = await Promise.all(LIST.map(yahoo));
  return rows.filter((x): x is NonNullable<typeof x> => x !== null);
}

/** Yahoo 결과에 국내 실시간 값을 덮어써서 화면용 시세 완성 */
export function mergeQuotes(base: Quote[], dom: Map<string, Tick>): Quote[] {
  return base.map((q) => {
    const t = dom.get(q.id);
    if (!t) return { ...q, diff: q.price - q.base, live: false };
    return { ...q, base: t.prev, price: t.price, diff: t.diff, change: (t.price / t.prev - 1) * 100, hist: [...q.hist.slice(0, -1), t.price], live: true };
  });
}
