/* =========================================================
   대륙별 실시간 이슈 순위 계산 (데모)
   20초 단위로 기사량 가중치가 바뀌며 순위가 움직입니다.
   ========================================================= */
import { ISSUES, type Region } from "./issues";

export interface RankItem {
  id: string;
  rank: number;
  /** +n 상승, -n 하락, 0 유지 */
  delta: number;
  isNew: boolean;
  heat: number;
}
export type Trends = Record<Region, RankItem[]>;

export const TREND_BUCKET_MS = 20_000;
const REGION_KEYS: Region[] = ["us", "eu", "asia", "africa"];

function order(region: Region, bucket: number) {
  return ISSUES.filter((x) => x.region === region)
    .map((x, i) => ({ id: x.id, heat: Math.round(x.articles * (1 + 0.42 * Math.sin(bucket * 1.31 + i * 2.17)) * 10) }))
    .sort((a, b) => b.heat - a.heat);
}

export function trendsAt(tMs: number): Trends {
  const bucket = Math.floor(tMs / TREND_BUCKET_MS);
  const out = {} as Trends;
  for (const r of REGION_KEYS) {
    const now = order(r, bucket);
    const prev = order(r, bucket - 1);
    out[r] = now.map((x, k) => {
      const pk = prev.findIndex((p) => p.id === x.id);
      const delta = pk - k;
      return { id: x.id, rank: k + 1, delta, isNew: delta >= 4, heat: x.heat };
    });
  }
  return out;
}

/** 서버 첫 렌더용 기본 순위 (기사 수 순) */
export const INITIAL_TRENDS: Trends = Object.fromEntries(
  REGION_KEYS.map((r) => [
    r,
    ISSUES.filter((x) => x.region === r)
      .sort((a, b) => b.articles - a.articles)
      .map((x, k) => ({ id: x.id, rank: k + 1, delta: 0, isNew: false, heat: x.articles * 10 })),
  ]),
) as Trends;
