import "server-only";
import { ISSUES, REGION_BRIEF, REGIONS, issueById as demoIssue, type Issue, type Region, type RegionBrief } from "../issues";
import { INITIAL_TRENDS, type RankItem, type Trends } from "../trends";
import { INITIAL_QUOTES, type Quote } from "../market";
import { briefOf, buildIssues, collect } from "./news";
import { fetchDomestic, fetchYahoo, mergeQuotes, type Tick } from "./quotes";

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
  pending?: Promise<LiveSnapshot>;
  archive: Map<string, Issue>;
  yahoo?: { at: number; data: Quote[] };
  yahooPending?: Promise<void>;
  dom?: { at: number; data: Map<string, Tick> };
  domPending?: Promise<void>;
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
  const perRegion = await Promise.all(REGION_KEYS.map((r) => collect(r, now)));
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

/** 최신 뉴스 스냅샷 (캐시 만료 시 백그라운드 갱신, 실패 시 직전 값 → 데모 순으로 대체) */
export async function getSnapshot(): Promise<LiveSnapshot> {
  const now = Date.now();
  const s = mem.snap;
  if (s && now - s.updatedAt < NEWS_TTL) return s;
  mem.pending ??= build(now)
    .then((x) => (mem.snap = x))
    .catch(() => (mem.snap = mem.snap ? { ...mem.snap, updatedAt: now } : { ...DEMO, updatedAt: now }))
    .finally(() => (mem.pending = undefined));
  // 이전 값이 있으면 기다리지 않고 바로 응답 (stale-while-revalidate)
  return s ?? mem.pending;
}

/** 이슈 상세 — 최근 수집분 → 데모 데이터 순으로 찾기 */
export async function getIssue(id: string): Promise<Issue | undefined> {
  if (!mem.archive.has(id) && !mem.snap) await getSnapshot();
  return mem.archive.get(id) ?? demoIssue(id);
}

export async function getQuotes(): Promise<{ at: number; data: Quote[]; source: "live" | "demo" }> {
  const now = Date.now();
  // 해외·미니차트: 만료되면 백그라운드 갱신 (처음 한 번만 기다림)
  if (!mem.yahoo || now - mem.yahoo.at > YAHOO_TTL) {
    mem.yahooPending ??= fetchYahoo()
      .then((data) => {
        if (data.length >= 5) mem.yahoo = { at: Date.now(), data };
      })
      .finally(() => (mem.yahooPending = undefined));
  }
  // 국내 실시간: 1초가 지났으면 새로 받아옴 (동시 요청은 하나로 합침)
  if (!mem.dom || now - mem.dom.at > DOMESTIC_TTL) {
    mem.domPending ??= fetchDomestic()
      .then((data) => {
        if (data.size) mem.dom = { at: Date.now(), data };
      })
      .finally(() => (mem.domPending = undefined));
  }
  await Promise.all([mem.yahoo ? null : mem.yahooPending, mem.domPending]);

  const base = mem.yahoo?.data ?? INITIAL_QUOTES;
  return {
    at: Math.max(mem.dom?.at ?? 0, mem.yahoo?.at ?? 0) || now,
    data: mergeQuotes(base, mem.dom?.data ?? new Map()),
    source: mem.yahoo || mem.dom ? "live" : "demo",
  };
}
