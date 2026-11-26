"use client";
import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@/components/providers";

/* =========================================================
   관심종목(즐겨찾기) — 회원별로 이 브라우저에 저장
   Supabase 연결 후에는 watchlist 테이블로 옮기면 됩니다.
   ========================================================= */
const KEY = "mv_favorites";
const subs = new Set<() => void>();
let cache: { raw: string | null; data: Record<string, string[]> } = { raw: null, data: {} };

function readAll(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cache.raw) cache = { raw, data: raw ? JSON.parse(raw) : {} };
  } catch {
    /* 저장소를 못 쓰는 환경 */
  }
  return cache.data;
}

function writeAll(data: Record<string, string[]>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 무시 */
  }
  cache = { raw: JSON.stringify(data), data };
  subs.forEach((f) => f());
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    subs.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
};

const EMPTY: string[] = [];

export function useFavorites() {
  const { user } = useAuth();
  const who = user?.username ?? "guest";
  const list = useSyncExternalStore(subscribe, () => readAll()[who] ?? EMPTY, () => EMPTY);
  const toggle = useCallback(
    (code: string) => {
      const all = { ...readAll() };
      const cur = all[who] ?? [];
      all[who] = cur.includes(code) ? cur.filter((c) => c !== code) : [code, ...cur].slice(0, 100);
      writeAll(all);
    },
    [who],
  );
  return { list, has: (code: string) => list.includes(code), toggle };
}
