export const pad = (n: number) => String(n).padStart(2, "0");
export const fmtNum = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
export const fmtTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const fmtDate = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
export const fmtHM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export const scoreLabel = (s: number) =>
  s >= 50 ? "강한 호재" : s >= 15 ? "호재" : s > -15 ? "중립" : s > -50 ? "악재" : "강한 악재";
export const upDown = (v: number) => (v > 0 ? "text-up" : v < 0 ? "text-down" : "text-ink-3");

export const maskPhone = (p: string) => p.replace(/^(\d{3})-(\d{3,4})-(\d{4})$/, "$1-****-$3");
export const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
};
