"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";

/* =========================================================
   실시간 연동 — URL별로 하나의 폴러를 공유합니다.
   (상단 키워드 띠와 대시보드가 같은 /api/trends 를 써도
   요청은 한 번만 나갑니다. WebSocket/SSE로 바꾸려면 이 파일만 수정)
   ========================================================= */
type Snap = { data: unknown; updatedAt: number } | null;
type Entry = { snap: Snap; subs: Set<() => void>; timer?: ReturnType<typeof setTimeout>; interval: number; gen: number };
const pollers = new Map<string, Entry>();

function entry(url: string, interval: number) {
  let e = pollers.get(url);
  if (!e) {
    e = { snap: null, subs: new Set(), interval, gen: 0 };
    pollers.set(url, e);
  }
  return e;
}

function start(url: string, e: Entry) {
  const gen = ++e.gen;
  const load = async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      // 4xx(없는 종목 등)도 화면에서 안내할 수 있게 응답을 그대로 전달
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        const json = await res.json();
        if (gen !== e.gen) return;
        e.snap = { data: json, updatedAt: json.updatedAt ?? Date.now() };
        e.subs.forEach((f) => f());
      }
    } catch {
      /* 네트워크 오류 시 다음 주기에 재시도 */
    }
    if (gen === e.gen && e.subs.size) e.timer = setTimeout(load, document.hidden ? e.interval * 4 : e.interval);
  };
  load();
}

export function usePoll<T>(url: string, intervalMs: number, initial: T) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const e = entry(url, intervalMs);
      e.subs.add(cb);
      if (e.subs.size === 1) start(url, e);
      return () => {
        e.subs.delete(cb);
        if (!e.subs.size) {
          clearTimeout(e.timer);
          e.gen++;
        }
      };
    },
    [url, intervalMs],
  );
  const snap = useSyncExternalStore(subscribe, () => pollers.get(url)?.snap ?? null, () => null);
  return { data: (snap?.data as T) ?? initial, updatedAt: snap?.updatedAt ?? null };
}

/** 현재 시각 — 서버/첫 렌더에서는 null (hydration 안전) */
export function useNow(tickMs = 1000) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const id = setInterval(cb, Math.min(tickMs, 1000));
      return () => clearInterval(id);
    },
    [tickMs],
  );
  const t = useSyncExternalStore(subscribe, () => Math.floor(Date.now() / tickMs) * tickMs, () => null);
  return useMemo(() => (t == null ? null : new Date(t)), [t]);
}
