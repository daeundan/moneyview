import "server-only";
import { decodeHtml, fetchRss, googleNews, type Article } from "./rss";
import { claim, release } from "./once";

/* =========================================================
   국내 전 종목 시세 (네이버 금융 공개 엔드포인트 · 무료 · 키 불필요)
   - 종목 목록(코스피·코스닥 전체): 60초 캐시
   - 화면에 보이는 종목 실시간 가격: 1초 캐시 (최대 80종목씩 묶어서 요청)
   - 차트: 분봉 5초 / 일봉 10분 캐시
   ※ 비공식 엔드포인트라 학습·테스트용. 서비스 출시 시 한국투자증권 KIS API로 교체하세요.
   ========================================================= */

export type Market = "KOSPI" | "KOSDAQ";
export type StockType = "stock" | "etf" | "etn";

export interface StockRow {
  code: string;
  name: string;
  market: Market;
  type: StockType;
  price: number;
  diff: number;
  rate: number;
  /** 거래대금 (백만원) */
  value: number;
  /** 시가총액 (억원) */
  cap: number;
  volume: number;
}

const UA = { "User-Agent": "Mozilla/5.0" };
const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const signOf = (code: unknown) => (code === "1" || code === "2" ? 1 : code === "4" || code === "5" ? -1 : 0);
export const isCode = (c: string) => /^[0-9A-Z]{6}$/.test(c);

async function getJson<T>(url: string, ms = 5000): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), cache: "no-store" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

type Mem = {
  universe?: { at: number; rows: StockRow[]; byCode: Map<string, StockRow> };
  rt: Map<string, { at: number; data: Map<string, Partial<StockRow> & { at: number }> }>;
  cache: Map<string, { at: number; data: unknown }>;
};
const g = globalThis as unknown as { __mvStocks?: Mem };
const mem: Mem = (g.__mvStocks ??= { rt: new Map(), cache: new Map() });

/* ---------------- 전 종목 목록 ---------------- */
type NaverListItem = Record<string, unknown> & { itemCode: string; stockName: string; stockEndType: string; compareToPreviousPrice?: { code?: string } };

function toRow(x: NaverListItem, market: Market): StockRow {
  const sign = signOf(x.compareToPreviousPrice?.code);
  return {
    code: x.itemCode,
    name: x.stockName,
    market,
    type: (["stock", "etf", "etn"].includes(x.stockEndType) ? x.stockEndType : "stock") as StockType,
    price: num(x.closePrice),
    diff: sign * Math.abs(num(x.compareToPreviousClosePrice)),
    rate: sign * Math.abs(num(x.fluctuationsRatio)),
    value: num(x.accumulatedTradingValue),
    cap: num(x.marketValue),
    volume: num(x.accumulatedTradingVolume),
  };
}

async function fetchMarket(market: Market): Promise<StockRow[]> {
  const url = (p: number) => `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${p}&pageSize=100`;
  const first = await getJson<{ totalCount: number; stocks: NaverListItem[] }>(url(1));
  if (!first) return [];
  const pages = Math.min(40, Math.ceil(first.totalCount / 100));
  const rows = first.stocks.map((x) => toRow(x, market));
  // 동시에 6페이지씩 요청 (상대 서버 부담 줄이기)
  for (let p = 2; p <= pages; p += 6) {
    const batch = await Promise.all(Array.from({ length: Math.min(6, pages - p + 1) }, (_, k) => getJson<{ stocks: NaverListItem[] }>(url(p + k))));
    for (const b of batch) rows.push(...(b?.stocks ?? []).map((x) => toRow(x, market)));
  }
  return rows;
}

export async function getUniverse() {
  const now = Date.now();
  if (!mem.universe || now - mem.universe.at > 60_000) {
    // 다른 요청이 이미 받아오는 중이면 직전 목록으로 응답
    if (claim("universe", 30_000) || !mem.universe) {
      try {
        const [a, b] = await Promise.all([fetchMarket("KOSPI"), fetchMarket("KOSDAQ")]);
        const rows = [...a, ...b];
        if (rows.length > 100) mem.universe = { at: Date.now(), rows, byCode: new Map(rows.map((r) => [r.code, r])) };
      } finally {
        release("universe");
      }
    }
  }
  return mem.universe ?? { at: now, rows: [], byCode: new Map<string, StockRow>() };
}

/* ---------------- 실시간 가격 (1초) ---------------- */
type Rt = Partial<StockRow> & { at: number; open?: number; high?: number; low?: number; status?: string };

async function fetchRealtime(codes: string[]): Promise<Map<string, Rt>> {
  const out = new Map<string, Rt>();
  for (let i = 0; i < codes.length; i += 80) {
    const part = codes.slice(i, i + 80);
    const d = await getJson<{ datas: Record<string, unknown>[] }>(`https://polling.finance.naver.com/api/realtime/domestic/stock/${part.join(",")}`, 3000);
    for (const x of d?.datas ?? []) {
      const sign = signOf((x.compareToPreviousPrice as { code?: string })?.code);
      out.set(String(x.itemCode), {
        price: num(x.closePrice),
        diff: sign * Math.abs(num(x.compareToPreviousClosePrice)),
        rate: sign * Math.abs(num(x.fluctuationsRatio)),
        volume: num(x.accumulatedTradingVolume),
        value: num(x.accumulatedTradingValue),
        open: num(x.openPrice),
        high: num(x.highPrice),
        low: num(x.lowPrice),
        status: String(x.marketStatus ?? ""),
        at: Date.parse(String(x.localTradedAt)) || Date.now(),
      });
    }
  }
  return out;
}

export async function getRealtime(codes: string[]) {
  const key = [...new Set(codes)].filter(isCode).sort().join(",");
  if (!key) return new Map<string, Rt>();
  const hit = mem.rt.get(key);
  if (hit && Date.now() - hit.at < 1000) return hit.data as Map<string, Rt>;
  const data = await fetchRealtime(key.split(","));
  mem.rt.set(key, { at: Date.now(), data });
  if (mem.rt.size > 200) mem.rt.delete(mem.rt.keys().next().value!);
  return data;
}

/** 목록 행에 실시간 값 덮어쓰기 */
export async function withRealtime(rows: StockRow[]) {
  const rt = await getRealtime(rows.map((r) => r.code));
  return rows.map((r) => {
    const t = rt.get(r.code);
    return t?.price ? { ...r, price: t.price, diff: t.diff ?? r.diff, rate: t.rate ?? r.rate, volume: t.volume || r.volume, value: t.value || r.value } : r;
  });
}

/* ---------------- 공용 캐시 ---------------- */
async function cached<T>(key: string, ttl: number, fn: () => Promise<T | null>): Promise<T | null> {
  const hit = mem.cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.data as T;
  const data = await fn();
  if (data != null) mem.cache.set(key, { at: Date.now(), data });
  if (mem.cache.size > 500) mem.cache.delete(mem.cache.keys().next().value!);
  return data ?? ((hit?.data as T) ?? null);
}

/* ---------------- 종목 상세 ---------------- */
export interface StockInfo {
  code: string;
  name: string;
  market: string;
  type: string;
  logo?: string;
  description?: string;
  infos: { key: string; label: string; value: string }[];
  industry?: string;
}

export async function getInfo(code: string): Promise<StockInfo | null> {
  return cached(`info:${code}`, 30_000, async () => {
    const [basic, integ] = await Promise.all([
      getJson<Record<string, unknown>>(`https://m.stock.naver.com/api/stock/${code}/basic`),
      getJson<Record<string, unknown>>(`https://m.stock.naver.com/api/stock/${code}/integration`),
    ]);
    if (!basic?.stockName) return null;
    const infos = ((integ?.totalInfos as { code: string; key: string; value: string }[]) ?? []).map((x) => ({ key: x.code, label: x.key, value: x.value }));
    return {
      code,
      name: String(basic.stockName),
      market: String(basic.stockExchangeName ?? ""),
      type: String(basic.stockEndType ?? "stock"),
      logo: typeof basic.itemLogoPngUrl === "string" ? basic.itemLogoPngUrl : undefined,
      description: typeof integ?.description === "string" ? integ.description : undefined,
      industry: (integ?.industryCompareInfo as { industryName?: string } | undefined)?.industryName,
      infos,
    };
  });
}

/* ---------------- 차트 ---------------- */
export type Range = "1d" | "1w" | "1m" | "3m" | "1y" | "5y";
export const RANGES: Range[] = ["1d", "1w", "1m", "3m", "1y", "5y"];
export interface Point { t: number; v: number; vol: number }

const ymd = (d: Date, hm = "") => {
  const k = new Date(d.getTime() + 9 * 3600_000); // KST
  return `${k.getUTCFullYear()}${String(k.getUTCMonth() + 1).padStart(2, "0")}${String(k.getUTCDate()).padStart(2, "0")}${hm}`;
};
/** "20261126093000" (KST) → epoch ms */
const parseKst = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8), +(s.slice(8, 10) || 15) - 9, +(s.slice(10, 12) || 30));

export async function getChart(code: string, range: Range, kind: "item" | "index" = "item"): Promise<Point[]> {
  const now = new Date();
  const base = `https://api.stock.naver.com/chart/domestic/${kind}/${code}`;
  if (range === "1d" || range === "1w") {
    const start = ymd(new Date(now.getTime() - (range === "1d" ? 0 : 9) * 86400_000), "0000");
    const rows = await cached(`chart:${kind}:${code}:${range}`, 5000, () =>
      getJson<{ localDateTime: string; currentPrice: number; accumulatedTradingVolume: number }[]>(`${base}/minute?startDateTime=${start}&endDateTime=${ymd(now, "2359")}`),
    );
    let pts = (Array.isArray(rows) ? rows : []).map((r) => ({ t: parseKst(r.localDateTime), v: r.currentPrice, vol: r.accumulatedTradingVolume }));
    // 오늘 장이 아직 안 열렸으면 마지막 거래일 분봉
    if (range === "1d" && pts.length === 0) {
      const prev = await cached(`chart:${kind}:${code}:1d-prev`, 60_000, () =>
        getJson<{ localDateTime: string; currentPrice: number; accumulatedTradingVolume: number }[]>(`${base}/minute?startDateTime=${ymd(new Date(now.getTime() - 6 * 86400_000), "0000")}&endDateTime=${ymd(now, "2359")}`),
      );
      const all = (Array.isArray(prev) ? prev : []).map((r) => ({ t: parseKst(r.localDateTime), v: r.currentPrice, vol: r.accumulatedTradingVolume }));
      const lastDay = all.length ? ymd(new Date(all[all.length - 1].t)) : "";
      pts = all.filter((p) => ymd(new Date(p.t)) === lastDay);
    }
    if (range === "1w") {
      // 최근 5거래일 · 5분 간격으로 줄이기
      const days = [...new Set(pts.map((p) => ymd(new Date(p.t))))].slice(-5);
      pts = pts.filter((p, i) => days.includes(ymd(new Date(p.t))) && i % 5 === 0);
    }
    return pts;
  }
  const back = { "1m": 31, "3m": 92, "1y": 366, "5y": 1830 }[range];
  const rows = await cached(`chart:${kind}:${code}:${range}`, 600_000, () =>
    getJson<{ localDate: string; closePrice: number; accumulatedTradingVolume: number }[]>(
      `${base}/day?startDateTime=${ymd(new Date(now.getTime() - back * 86400_000), "0000")}&endDateTime=${ymd(now, "2359")}`,
    ),
  );
  let pts = (Array.isArray(rows) ? rows : []).map((r) => ({ t: parseKst(r.localDate), v: r.closePrice, vol: r.accumulatedTradingVolume }));
  if (range === "5y") pts = pts.filter((_, i) => i % 5 === 0 || i === pts.length - 1);
  return pts;
}

/* ---------------- 종목 뉴스 (제목·링크만) ---------------- */
type NaverNews = { items?: { officeName?: string; datetime?: string; title?: string; mobileNewsUrl?: string; officeId?: string; articleId?: string }[] }[];

/** 네이버 증권 종목 뉴스 (datetime: "YYYYMMDDHHmm", 한국시간) */
async function naverStockNews(code: string): Promise<Article[]> {
  const d = await getJson<NaverNews>(`https://m.stock.naver.com/api/news/stock/${code}?pageSize=10`);
  return (d ?? [])
    .flatMap((x) => x.items ?? [])
    .map((x) => {
      const t = x.datetime ?? "";
      const time = t.length >= 12 ? Date.UTC(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8), +t.slice(8, 10) - 9, +t.slice(10, 12)) : 0;
      const link = x.mobileNewsUrl || (x.officeId && x.articleId ? `https://n.news.naver.com/mnews/article/${x.officeId}/${x.articleId}` : "");
      return { title: decodeHtml(x.title ?? ""), link, press: x.officeName ?? "언론사", time };
    })
    .filter((a) => a.title && a.link);
}

export async function getStockNews(code: string, name: string) {
  return (
    (await cached(`news:${code}`, 300_000, async () => {
      let list = await naverStockNews(code);
      if (!list.length) list = await fetchRss(googleNews(`"${name}" 주가 OR 실적 OR 주식`));
      return list.length ? list.sort((a, b) => b.time - a.time).slice(0, 8) : null;
    })) ?? []
  );
}
