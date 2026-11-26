import "server-only";
import type { Category, Dir, Issue, Region, RegionBrief } from "../issues";
import { CAT_HINT, DEFAULT_SECTORS, NEG, POS, STOP, TERMS, type Term } from "./dict";
import { fetchRss, googleNews, type Article } from "./rss";

/* =========================================================
   뉴스 → 이슈 키워드 → 자동 요약 리포트 (무료 규칙 기반)
   ========================================================= */

/** 대륙별 수집 피드 — 모두 무료 · 키 불필요 */
export const FEEDS: Record<Region, { url: string; press?: string }[]> = {
  us: [
    { url: googleNews("뉴욕증시 OR 월가 OR 연준 OR 미국 증시") },
    { url: googleNews("미국 경제 OR 트럼프 관세 OR 미국 기업 실적") },
  ],
  eu: [
    { url: googleNews("유럽 증시 OR 유로존 OR ECB OR 유럽 경제") },
    { url: googleNews("EU 집행위 OR 독일 경제 OR 영국 경제 OR 프랑스 경제") },
  ],
  asia: [
    { url: googleNews("코스피 OR 코스닥 OR 한국은행 OR 국내 증시") },
    { url: googleNews("중국 경제 OR 일본 증시 OR 아시아 증시 OR 대만 반도체") },
    { url: "https://www.yna.co.kr/rss/economy.xml", press: "연합뉴스" },
    { url: "https://www.hankyung.com/feed/economy", press: "한국경제" },
  ],
  africa: [
    { url: googleNews("아프리카 경제 OR 남아공 OR 나이지리아 OR 케냐") },
    { url: googleNews("이집트 경제 OR 아프리카 자원 OR 아프리카 투자") },
  ],
};

const REGION_WORDS: Record<Region, string[]> = {
  us: ["미국", "美", "뉴욕", "월가", "연준", "트럼프"],
  eu: ["유럽", "EU", "유로", "유럽연합", "유로존", "독일", "프랑스", "영국", "ECB"],
  asia: ["한국", "코스피", "중국", "일본", "대만", "인도", "아시아"],
  africa: ["아프리카", "남아공", "나이지리아", "이집트", "케냐", "에티오피아"],
};

const JOSA = ["에서는", "으로는", "에서", "으로", "에게", "까지", "부터", "보다", "처럼", "이라", "라는", "하는", "했다", "한다", "된다", "되는", "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "도", "만", "로"];

const norm = (s: string) => s.replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, " ").replace(/[“”"'‘’`…·]/g, " ").replace(/\s+/g, " ").trim();

function tokens(title: string) {
  return norm(title)
    .split(/[^0-9A-Za-z가-힣&]+/)
    .map((w) => {
      for (const j of JOSA) if (w.endsWith(j) && w.length - j.length >= 2) return w.slice(0, -j.length);
      return w;
    })
    .filter((w) => w.length >= 2 && w.length <= 8 && !/^\d+$/.test(w) && !STOP.has(w));
}

/** 짧은 문자열 해시 → 키워드별 고정 id */
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
}
export const issueId = (r: Region, kw: string) => `${r}-${hash(kw)}`;

function sentiment(titles: string[]) {
  let p = 0, n = 0;
  for (const t of titles) {
    for (const w of POS) if (t.includes(w)) p++;
    for (const w of NEG) if (t.includes(w)) n++;
  }
  return Math.max(-90, Math.min(90, Math.round(((p - n) / (p + n + 3)) * 100)));
}

function guessCategory(titles: string[]): Category {
  let best: Category = "industry", bestN = 0;
  for (const [c, hints] of CAT_HINT) {
    const n = titles.reduce((s, t) => s + hints.filter((h) => t.includes(h)).length, 0);
    if (n > bestN) [best, bestN] = [c, n];
  }
  return best;
}

const dirOf = (s: 1 | -1, score: number): Dir => (Math.abs(score) < 10 ? 0 : ((s * Math.sign(score)) as Dir));

type Cand = { key: string; term?: Term; arts: Set<number> };

/** 한 대륙의 기사 → 이슈 목록 (기사 많은 순) */
export function buildIssues(region: Region, articles: Article[], max = 8): Issue[] {
  // 1) 키워드 후보 만들기: 사전 매칭 + 자주 나온 단어
  const cands = new Map<string, Cand>();
  const add = (key: string, i: number, term?: Term) => {
    const c = cands.get(key) ?? { key, term, arts: new Set<number>() };
    c.arts.add(i);
    cands.set(key, c);
  };
  articles.forEach((a, i) => {
    const t = a.title;
    const hit = new Set<string>();
    for (const term of TERMS) if (term.aliases.some((al) => t.includes(al))) { add(term.term, i, term); hit.add(term.term); }
    for (const w of new Set(tokens(t))) {
      if (REGION_WORDS[region].includes(w)) continue;
      if ([...hit].some((h) => TERMS.find((x) => x.term === h)!.aliases.some((al) => al.includes(w) || w.includes(al)))) continue;
      add(w, i);
    }
  });

  // 사전 키워드는 2건 이상, 일반 단어는 3건 이상 등장해야 후보
  const ranked = [...cands.values()]
    .filter((c) => c.arts.size >= (c.term ? 2 : 3))
    .sort((a, b) => b.arts.size + (b.term ? 1.5 : 0) - (a.arts.size + (a.term ? 1.5 : 0)));

  // 2) 상위 후보마다 가장 자주 같이 나온 단어를 붙여 "트럼프 관세" 같은 키워드로
  const used = new Set<number>();
  const out: Issue[] = [];
  const seenKw = new Set<string>();
  for (const c of ranked) {
    if (out.length >= max) break;
    const arts = [...c.arts];
    // 이미 다른 이슈가 대부분 가져간 기사라면 건너뜀 (중복 이슈 방지)
    if (arts.filter((i) => used.has(i)).length / arts.length > 0.7) continue;

    let partner: Cand | undefined, pBest = 0;
    for (const o of ranked) {
      if (o === c || (!o.term && !c.term)) continue;
      const co = arts.filter((i) => o.arts.has(i)).length;
      if (co > pBest) [partner, pBest] = [o, co];
    }
    const pair = partner && pBest >= Math.max(2, arts.length * 0.35) && !partner.key.includes(c.key) && !c.key.includes(partner.key);
    const keyword = pair ? `${c.key} ${partner!.key}` : c.key;
    const flip = pair ? `${partner!.key} ${c.key}` : "";
    if (seenKw.has(keyword) || seenKw.has(flip)) continue;
    seenKw.add(keyword);
    arts.forEach((i) => used.add(i));

    const list = arts.map((i) => articles[i]).sort((a, b) => b.time - a.time);
    const titles = list.map((a) => a.title);
    const term = c.term ?? partner?.term;
    const score = sentiment(titles);
    const category = term?.category ?? guessCategory(titles);
    const baseSectors = term?.sectors ?? DEFAULT_SECTORS[category];

    // 대표 헤드라인: 키워드 단어가 함께 들어간 가장 최신 제목
    const words = keyword.split(" ");
    const headline = (list.find((a) => words.every((w) => a.title.includes(w))) ?? list[0]).title;
    const presses = [...new Set(list.map((a) => a.press))];
    const points = uniqueBy(list.filter((a) => a.title !== headline), (a) => a.title.slice(0, 12)).slice(0, 3).map((a) => norm(a.title));
    while (points.length < 3) points.push(points.length === 0 ? headline : `${presses.slice(0, 3).join("·")} 등 ${presses.length}개 매체 보도`);

    const tone = score >= 15 ? "긍정적" : score <= -15 ? "부정적" : "엇갈린";
    const summary =
      `최근 24시간 동안 ${list.length}건의 기사에서 '${keyword}' 관련 소식이 다뤄졌습니다. ` +
      `가장 많이 보도된 내용은 "${norm(headline)}"입니다. ` +
      `제목에 쓰인 표현을 분석하면 시장에는 ${tone} 신호로 읽힙니다.`;

    out.push({
      id: issueId(region, keyword),
      region,
      keyword,
      category,
      headline: norm(headline),
      summary,
      points,
      score,
      sectors: baseSectors.slice(0, 3).map(([n, s, why]) => [n, dirOf(s, score), why]),
      tickers: (term?.tickers ?? []).slice(0, 4).map(([n, s]) => [n, dirOf(s, score)]),
      articles: list.length,
      sources: list.slice(0, 12).map((a) => ({ title: norm(a.title), link: a.link, press: a.press, time: a.time })),
    });
  }
  return out;
}

function uniqueBy<T>(arr: T[], key: (x: T) => string) {
  const s = new Set<string>();
  return arr.filter((x) => (s.has(key(x)) ? false : (s.add(key(x)), true)));
}

/** 대륙 한 줄 브리핑 */
export function briefOf(issues: Issue[]): RegionBrief {
  if (!issues.length) return { mood: 0, line: "수집된 기사가 아직 적어요" };
  const w = issues.reduce((s, x) => s + x.articles, 0);
  const mood = Math.round(issues.reduce((s, x) => s + x.score * x.articles, 0) / w);
  const [a, b] = issues;
  const tone = mood >= 15 ? "위험선호 우세" : mood <= -15 ? "경계 심리 우세" : "관망 속 혼조";
  return { mood, line: `'${a.keyword}'${b ? `·'${b.keyword}'` : ""} 이슈 중심, ${tone}` };
}

/** 피드를 모두 읽고 중복 제거 (최근 36시간) */
export async function collect(region: Region, now: number): Promise<Article[]> {
  const lists = await Promise.all(FEEDS[region].map((f) => fetchRss(f.url, f.press)));
  const seen = new Set<string>();
  return lists
    .flat()
    .filter((a) => !a.time || now - a.time < 36 * 3600_000)
    .filter((a) => {
      const k = norm(a.title).replace(/\s/g, "").slice(0, 22);
      return seen.has(k) ? false : (seen.add(k), true);
    });
}
