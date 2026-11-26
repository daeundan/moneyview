"use client";
import { useEffect, useRef, useState } from "react";
import { useFavorites } from "@/lib/favorites";
import { cx } from "@/lib/format";
import { Icon } from "@/components/ui/icons";

export const won = (n: number) => Math.round(n).toLocaleString("ko-KR");
export const toneOf = (v: number) => (v > 0 ? "text-up" : v < 0 ? "text-down" : "text-ink-2");
export const signed = (v: number, digits = 2) => `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;

/** 거래대금(백만원) → "1조 8,018억" */
export function krwHangeul(million: number) {
  const eok = million / 100;
  if (eok >= 10000) return `${(eok / 10000).toFixed(1).replace(/\.0$/, "")}조`;
  if (eok >= 1) return `${Math.round(eok).toLocaleString("ko-KR")}억`;
  return `${Math.round(million).toLocaleString("ko-KR")}백만`;
}
/** 시가총액(억원) → "1,016조" */
export function capHangeul(eok: number) {
  if (eok >= 10000) return `${(eok / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}조`;
  return `${Math.round(eok).toLocaleString("ko-KR")}억`;
}

/** 종목 로고 — 이미지가 없으면 첫 글자 */
export function StockLogo({ code, name, size = 36 }: { code: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const hue = [...code].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360;
  return (
    <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-[13px] font-bold text-white" style={{ width: size, height: size, background: err ? `hsl(${hue} 45% 52%)` : undefined }}>
      {err ? (
        name.slice(0, 1)
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://ssl.pstatic.net/imgstock/fn/real/logo/png/stock/Stock${code}.png`} alt="" width={size} height={size} loading="lazy" onError={() => setErr(true)} className="size-full object-cover" />
      )}
    </span>
  );
}

export function FavButton({ code, name, className }: { code: string; name: string; className?: string }) {
  const fav = useFavorites();
  const on = fav.has(code);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `${name} 관심종목 해제` : `${name} 관심종목 추가`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        fav.toggle(code);
      }}
      className={cx("grid size-9 shrink-0 place-items-center rounded-full transition active:scale-90", on ? "text-amber-400" : "text-ink-3/50 hover:text-ink-3", className)}
    >
      <Icon name="star" className="size-[19px]" fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** 값이 바뀔 때 잠깐 번쩍이는 효과 */
export function useFlash(value: number) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<{ dir: "up" | "down"; n: number } | null>(null);
  useEffect(() => {
    if (value !== prev.current) {
      setFlash((f) => ({ dir: value > prev.current ? "up" : "down", n: (f?.n ?? 0) + 1 }));
      prev.current = value;
      const t = setTimeout(() => setFlash(null), 650);
      return () => clearTimeout(t);
    }
  }, [value]);
  return flash;
}
