"use client";
import { useMemo } from "react";
import { usePoll } from "./hooks";
import type { Issue, Region, RegionBrief } from "./issues";
import type { Trends } from "./trends";

/* =========================================================
   화면 전체가 공유하는 실시간 뉴스 데이터 (/api/trends 1분 폴링)
   서버는 5분마다 새로 수집하므로 1분 폴링이면 충분합니다.
   ========================================================= */
export interface LiveData {
  updatedAt: number;
  source: "live" | "demo";
  trends: Trends;
  issues: Issue[];
  briefs: Record<Region, RegionBrief>;
  articleCount: number;
}

const wait: RegionBrief = { mood: 0, line: "뉴스를 모으는 중이에요…" };
const EMPTY: LiveData = {
  updatedAt: 0,
  source: "live",
  trends: { us: [], eu: [], asia: [], africa: [] },
  issues: [],
  briefs: { us: wait, eu: wait, asia: wait, africa: wait },
  articleCount: 0,
};

export function useLive() {
  const { data, updatedAt } = usePoll<LiveData>("/api/trends", 60_000, EMPTY);
  const byId = useMemo(() => new Map(data.issues.map((x) => [x.id, x])), [data.issues]);
  return { ...data, loaded: updatedAt != null, issue: (id: string) => byId.get(id) };
}

/** 기사량 가중 평균 투자심리 */
export function moodOf(issues: Issue[]) {
  const w = issues.reduce((s, x) => s + x.articles, 0);
  return w ? Math.round(issues.reduce((s, x) => s + x.score * x.articles, 0) / w) : 0;
}

export const moodLabel = (m: number) => (m >= 30 ? "강한 위험선호" : m >= 8 ? "완만한 위험선호" : m > -8 ? "관망" : m > -30 ? "경계 심리" : "위험회피");

/** 기사 시각 → "12분 전" */
export function ago(t: number, now: number) {
  const m = Math.max(0, Math.round((now - t) / 60_000));
  return m < 1 ? "방금" : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`;
}
