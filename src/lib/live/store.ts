import "server-only";
import { ISSUES, REGION_BRIEF, REGIONS, issueById as demoIssue, type Issue, type Region, type RegionBrief } from "../issues";
import { INITIAL_TRENDS, type RankItem, type Trends } from "../trends";
import { INITIAL_QUOTES, type Quote } from "../market";
import { briefOf, buildIssues, collect, fetchPool } from "./news";
import { fetchDomestic, fetchYahoo, mergeQuotes, type Tick } from "./quotes";
import { claim, release } from "./once";

/* =========================================================
   서버 메모리 캐시 (DB 없이 무료로 동작)
   - 뉴스: 5분마다 새로 수집 → 순위 변동(▲▼ NEW) 계산
   - 시세: 국내 1초 · 해외 60초 캐시
   요청이 몰려도 외부 사이트에는 주기당 한 번만 요청합니다.
   ※ 서버 재시작 시 초기화됩니다. 기록을 남기려면 다음 단계에서 Supabase에 저장하세요.
   ========================================================= */

export const NEWS_TTL = 5 * 60_000;
/** 해외(Yahoo) 60초 · 국내(네이버) 1초 */
export const YAHOO_TTL = 60_000;
export const DOMESTIC_TTL = 1_000;
const REGION_KEYS = Object.keys(REGIONS) as Region[];

export interface LiveSnapshot {
  updatedAt: number;
  source: "live" | "demo";
  trends: Trends;
  issues: Issue[];
  briefs: Record<Region, RegionBrief>;
  articleCount: number;
}

type Mem = {
  snap?: LiveSnapshot;
  archive: Map<string, Issue>;
  yahoo?: { at: number; data: Quote[] };
  dom?: { at: number; data: Map<string, Tick> };
};
const g = globalThis as unknown as { __mv?: Mem };
const mem: Mem = (g.__mv ??= { archive: new Map() });

const DEMO: LiveSnapshot = {
  updatedAt: 0,
  source: "demo",
  trends: INITIAL_TRENDS,
  issues: ISSUES,
  briefs: REGION_BRIEF,
  articleCount: ISSUES.reduce((s, x) => s + x.articles, 0),
};

async function build(now: number): Promise<LiveSnapshot> {
  const prev = mem.snap?.source === "live" ? mem.snap : undefined;
  const pool = await fetchPool();
  const perRegion = await Promise.all(REGION_KEYS.map((r) => collect(r, now, pool)));
  const articleCount = perRegion.reduce((s, a) => s + a.length, 0);
  if (articleCount < 20) throw new Error("뉴스 수집 실패");

  const trends = {} as Trends;
  const briefs = {} as Record<Region, RegionBrief>;
  const issues: Issue[] = [];
  REGION_KEYS.forEach((r, k) => {
    const list = buildIssues(r, perRegion[k]);
    issues.push(...list);
    briefs[r] = briefOf(list);
    const before = prev?.trends[r] ?? [];
    trends[r] = list.map<RankItem>((x, i) => {
      const old = before.find((b) => b.id === x.id);
      return { id: x.id, rank: i + 1, delta: old ? old.rank - (i + 1) : 0, isNew: !!prev && !old, heat: x.articles * 10 };
    });
  });

  for (const x of issues) mem.archive.set(x.id, x);
  if (mem.archive.size > 600) for (const k of [...mem.archive.keys()].slice(0, mem.archive.size - 600)) mem.archive.delete(k);

  return { updatedAt: now, source: "live", trends, issues, briefs, articleCount };
}

/* Cloudflare에서는 요청이 여러 인스턴스로 나뉘므로, 무료 Cache API로 결과를 공유 (Node에서는 건너뜀) */
type EdgeCache = { match(k: string): Promise<Response | undefined>; put(k: string, r: Response): Promise<void> };
const edge = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;
const EDGE_KEY = "https://moneyview.cache/news-snapshot";

async function fromEdge(now: number): Promise<LiveSnapshot | undefined> {
  try {
    const x = (await (await edge?.match(EDGE_KEY))?.json()) as LiveSnapshot | undefined;
    if (x?.source === "live" && now - x.updatedAt < NEWS_TTL) {
      for (const i of x.issues) mem.archive.set(i.id, i);
      return x;
    }
  } catch {
    /* 캐시 없음 */
  }
}

async function toEdge(x: LiveSnapshot) {
  if (!edge || x.source !== "live") return;
  try {
    await edge.put(EDGE_KEY, new Response(JSON.stringify(x), { headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${NEWS_TTL / 1000}` } }));
  } catch {
    /* 무시 */
  }
}

/** 최신 뉴스 스냅샷 (다른 요청이 갱신 중이면 직전 값으로 바로 응답, 실패 시 직전 값 → 데모 순으로 대체) */
export async function getSnapshot(): Promise<LiveSnapshot> {
  const now = Date.now();
  const s = mem.snap;
  if (s && now - s.updatedAt < NEWS_TTL) return s;
  const shared = await fromEdge(now);
  if (shared && (!s || shared.updatedAt > s.updatedAt)) return (mem.snap = shared);
  if (!claim("news", 20_000) && s) return s;
  try {
    mem.snap = await build(now);
    await toEdge(mem.snap);
  } catch {
    mem.snap = mem.snap ? { ...mem.snap, updatedAt: now } : { ...DEMO, updatedAt: now };
  } finally {
    release("news");
  }
  return mem.snap;
}

/** 이슈 상세 — 최근 수집분 → 데모 데이터 순으로 찾기 */
export async function getIssue(id: string): Promise<Issue | undefined> {
  if (!mem.archive.has(id) && !mem.snap) await getSnapshot();
  return mem.archive.get(id) ?? demoIssue(id);
}

export async function getQuotes(): Promise<{ at: number; data: Quote[]; source: "live" | "demo" }> {
  const now = Date.now();
  const jobs: Promise<void>[] = [];
  // 해외·미니차트: 1분마다 갱신
  if (!mem.yahoo || now - mem.yahoo.at > YAHOO_TTL) {
    if (claim("yahoo", 10_000) || !mem.yahoo)
      jobs.push(
        fetchYahoo()
          .then((data) => {
            if (data.length >= 5) mem.yahoo = { at: Date.now(), data };
          })
          .finally(() => release("yahoo")),
      );
  }
  // 국내 실시간: 1초가 지났으면 새로 받아옴 (동시에 온 요청은 직전 값 사용)
  if (!mem.dom || now - mem.dom.at > DOMESTIC_TTL) {
    if (claim("dom", 3_000) || !mem.dom)
      jobs.push(
        fetchDomestic()
          .then((data) => {
            if (data.size) mem.dom = { at: Date.now(), data };
          })
          .finally(() => release("dom")),
      );
  }
  await Promise.allSettled(jobs);

  const base = mem.yahoo?.data ?? INITIAL_QUOTES;
  return {
    at: Math.max(mem.dom?.at ?? 0, mem.yahoo?.at ?? 0) || now,
    data: mergeQuotes(base, mem.dom?.data ?? new Map()),
    source: mem.yahoo || mem.dom ? "live" : "demo",
  };
}
