import "server-only";
import { decodeHtml, fetchRss, googleNews, type Article } from "./rss";
import { claim, release } from "./once";
import snapshotJson from "./universe-snapshot.json";

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

/**
 * 네이버 요청 — Cloudflare에서는 20~30%가 응답 없이 멈추는 일이 있어
 * 짧게 기다리고 다시 시도합니다. status 0 = 연결 실패/시간 초과
 */
async function getJsonEx<T>(url: string, ms = 2500, tries = 3): Promise<{ data: T | null; status: number }> {
  let status = 0;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), cache: "no-store" });
      status = res.status;
      if (res.ok) return { data: (await res.json()) as T, status };
      if (res.status < 500) break; // 없는 종목 등은 다시 시도해도 같음
    } catch {
      status = 0;
    }
  }
  return { data: null, status };
}
const getJson = async <T>(url: string, ms?: number) => (await getJsonEx<T>(url, ms)).data;

type Mem = {
  universe?: Universe;
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

/** 한 시장 전체 — 실패한 페이지는 null (부분 결과로 직전 목록을 덮어쓰지 않기 위해) */
async function fetchMarket(market: Market): Promise<StockRow[] | null> {
  const url = (p: number) => `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${p}&pageSize=100`;
  const first = await getJson<{ totalCount: number; stocks: NaverListItem[] }>(url(1));
  if (!first) return null;
  const pages = Math.min(40, Math.ceil(first.totalCount / 100));
  const rows = first.stocks.map((x) => toRow(x, market));
  // 동시에 4페이지씩 요청 (상대 서버 부담 줄이기)
  for (let p = 2; p <= pages; p += 4) {
    const batch = await Promise.all(Array.from({ length: Math.min(4, pages - p + 1) }, (_, k) => getJson<{ stocks: NaverListItem[] }>(url(p + k))));
    if (batch.some((b) => !b)) return null;
    for (const b of batch) rows.push(...b!.stocks.map((x) => toRow(x, market)));
  }
  return rows;
}

type Universe = { at: number; rows: StockRow[]; byCode: Map<string, StockRow> };
const TYPES: StockType[] = ["stock", "etf", "etn"];
const makeUniverse = (at: number, rows: StockRow[]): Universe => ({ at, rows, byCode: new Map(rows.map((r) => [r.code, r])) });

/** 비상용 목록 (npm run sync:stocks 로 갱신) — 네이버가 응답하지 않을 때 사용 */
function snapshot(): Universe {
  type Raw = [string, string, number, number, number, number, number, number, number, number];
  const snap = snapshotJson as { at: number; rows: Raw[] };
  return makeUniverse(
    0,
    snap.rows.map(([code, name, m, t, price, diff, rate, value, cap, volume]) => ({ code, name, market: m ? "KOSDAQ" : "KOSPI", type: TYPES[t] ?? "stock", price, diff, rate, value, cap, volume })),
  );
}

/* Cloudflare 인스턴스끼리 목록 공유 (무료 Cache API, Node에서는 건너뜀) */
type EdgeCache = { match(k: string): Promise<Response | undefined>; put(k: string, r: Response): Promise<void> };
const edge = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;
const EDGE_KEY = "https://moneyview.cache/universe";
const LIST_TTL = 60_000;

async function refreshUniverse() {
  if (!claim("universe", 30_000)) return;
  try {
    const [a, b] = await Promise.all([fetchMarket("KOSPI"), fetchMarket("KOSDAQ")]);
    if (!a || !b) return; // 일부라도 실패하면 직전 목록 유지
    mem.universe = makeUniverse(Date.now(), [...a, ...b]);
    await edge?.put(EDGE_KEY, new Response(JSON.stringify({ at: mem.universe.at, rows: mem.universe.rows }), { headers: { "Cache-Control": "max-age=600" } })).catch(() => {});
  } finally {
    release("universe");
  }
}

/** 응답이 끝난 뒤에도 작업을 이어가기 (Cloudflare: waitUntil, Node: 그냥 실행) */
async function background(p: Promise<unknown>) {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    getCloudflareContext().ctx.waitUntil(p);
  } catch {
    /* Node 환경 */
  }
}

export async function getUniverse(): Promise<Universe> {
  const now = Date.now();
  if (mem.universe && now - mem.universe.at < LIST_TTL) return mem.universe;
  // 다른 인스턴스가 받아 둔 목록
  try {
    const hit = (await (await edge?.match(EDGE_KEY))?.json()) as { at: number; rows: StockRow[] } | undefined;
    if (hit && (!mem.universe || hit.at > mem.universe.at)) mem.universe = makeUniverse(hit.at, hit.rows);
  } catch {
    /* 캐시 없음 */
  }
  if (mem.universe && now - mem.universe.at < LIST_TTL) return mem.universe;
  // 직전 목록(없으면 비상용 목록)으로 바로 응답하고, 새 목록은 뒤에서 받아 둠
  void background(refreshUniverse());
  return mem.universe ?? (mem.universe = { ...snapshot(), at: now - LIST_TTL + 15_000 });
}

/* ---------------- 실시간 가격 (1초) ---------------- */
type Rt = Partial<StockRow> & { at: number; open?: number; high?: number; low?: number; status?: string };

async function fetchRealtime(codes: string[]): Promise<Map<string, Rt>> {
  const out = new Map<string, Rt>();
  for (let i = 0; i < codes.length; i += 80) {
    const part = codes.slice(i, i + 80);
    const { data: d } = await getJsonEx<{ datas: Record<string, unknown>[] }>(`https://polling.finance.naver.com/api/realtime/domestic/stock/${part.join(",")}`, 1200, 2);
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
  // 이번에 못 받았으면 직전 값 유지 (가격이 옛 값으로 튀지 않게)
  if (!data.size && hit) return hit.data as Map<string, Rt>;
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

/** null = 없는 종목, undefined = 네이버 일시 장애 (직전 값이 있으면 그것을 돌려줌) */
export async function getInfo(code: string): Promise<StockInfo | null | undefined> {
  const key = `info:${code}`;
  const hit = mem.cache.get(key) as { at: number; data: StockInfo } | undefined;
  if (hit && Date.now() - hit.at < 30_000) return hit.data;
  const [basic, integ] = await Promise.all([
    getJsonEx<Record<string, unknown>>(`https://m.stock.naver.com/api/stock/${code}/basic`, 2000),
    getJsonEx<Record<string, unknown>>(`https://m.stock.naver.com/api/stock/${code}/integration`, 2000),
  ]);
  if (!basic.data?.stockName) {
    if (hit) return hit.data;
    return basic.status >= 400 && basic.status < 500 ? null : undefined;
  }
  const b = basic.data;
  const i = integ.data;
  const infos = ((i?.totalInfos as { code: string; key: string; value: string }[]) ?? []).map((x) => ({ key: x.code, label: x.key, value: x.value }));
  const data: StockInfo = {
    code,
    name: String(b.stockName),
    market: String(b.stockExchangeName ?? ""),
    type: String(b.stockEndType ?? "stock"),
    logo: typeof b.itemLogoPngUrl === "string" ? b.itemLogoPngUrl : undefined,
    description: typeof i?.description === "string" ? i.description : undefined,
    industry: (i?.industryCompareInfo as { industryName?: string } | undefined)?.industryName,
    infos,
  };
  // 통합 정보가 빠졌으면 다음 요청에서 다시 받도록 캐시하지 않음
  if (i) mem.cache.set(key, { at: Date.now(), data });
  if (mem.cache.size > 500) mem.cache.delete(mem.cache.keys().next().value!);
  return !i && hit ? { ...hit.data, ...data, infos: hit.data.infos, description: hit.data.description } : data;
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
