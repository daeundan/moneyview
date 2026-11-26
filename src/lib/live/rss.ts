import "server-only";

/* =========================================================
   RSS 수집기 — 무료 · API 키 불필요
   저작권을 고려해 기사 본문은 저장하지 않고
   제목 · 언론사 · 링크 · 시각만 사용합니다.
   ========================================================= */

export interface Article {
  title: string;
  link: string;
  press: string;
  time: number;
}

const UA = "Mozilla/5.0 (compatible; MoneyViewBot/0.1; +educational)";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const tag = (item: string, name: string) => {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};

/** RSS 한 개를 읽어 기사 목록으로 변환 (실패하면 빈 배열) */
export async function fetchRss(url: string, defaultPress = ""): Promise<Article[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
    return items
      .map((it) => {
        let title = tag(it, "title");
        let press = tag(it, "source") || defaultPress;
        // 구글 뉴스 제목은 "제목 - 언론사" 형태
        const dash = title.lastIndexOf(" - ");
        if (dash > 0 && (!defaultPress || press === tag(it, "source"))) {
          press = press || title.slice(dash + 3);
          title = title.slice(0, dash);
        }
        // "제목 - 언론사 - 언론사"처럼 꼬리가 반복되는 경우 정리
        while (/ - [^-]{1,15}$/.test(title)) title = title.replace(/ - [^-]{1,15}$/, "");
        const time = Date.parse(tag(it, "pubDate")) || 0;
        return { title, link: tag(it, "link"), press: press || "언론사", time };
      })
      .filter((a) => a.title && a.link);
  } catch {
    return [];
  }
}

/** 구글 뉴스 검색 RSS (한국어 · 최근 1일) */
export const googleNews = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:1d`)}&hl=ko&gl=KR&ceid=KR:ko`;
