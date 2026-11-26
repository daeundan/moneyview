/* =========================================================
   동시 요청 정리 — '지금 갱신 중'이라는 표시만 공유합니다.
   Cloudflare Workers는 한 요청에서 만든 Promise를 다른 요청이
   기다릴 수 없어서, Promise 자체는 공유하지 않습니다.
   ========================================================= */
const g = globalThis as unknown as { __mvBusy?: Map<string, number> };
const busy: Map<string, number> = (g.__mvBusy ??= new Map());

/** 갱신 권한 얻기 — 다른 요청이 ms 안에 이미 시작했다면 false */
export function claim(key: string, ms: number) {
  const now = Date.now();
  const t = busy.get(key);
  if (t && now - t < ms) return false;
  busy.set(key, now);
  return true;
}

export function release(key: string) {
  busy.delete(key);
}
