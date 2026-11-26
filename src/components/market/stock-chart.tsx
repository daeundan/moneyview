"use client";
import { useMemo, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { won } from "./parts";

export interface Point { t: number; v: number; vol: number; hi?: number; lo?: number }
export type Range = "1d" | "1w" | "1m" | "3m" | "1y" | "5y";

const W = 1000;
const H = 300;
const PAD_T = 24;
const PAD_B = 24;

const kst = (t: number) => new Date(t + 9 * 3600_000);
const two = (n: number) => String(n).padStart(2, "0");
function label(t: number, range: Range) {
  const d = kst(t);
  const md = `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
  const hm = `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
  if (range === "1d") return hm;
  if (range === "1w") return `${md} ${hm}`;
  if (range === "5y" || range === "1y") return `${d.getUTCFullYear()}.${two(d.getUTCMonth() + 1)}.${two(d.getUTCDate())}`;
  return md;
}

/** 토스증권 스타일 라인 차트 — 마우스/터치로 가격 확인, 1일 차트는 장 시간(09:00~15:30) 기준으로 그려짐 */
/** dayHigh·dayLow: 1일 차트에서 정규장+NXT 통합 고가·저가 (토스증권과 같은 값) */
export function StockChart({ points, base, range, live, dayHigh, dayLow }: { points: Point[]; base: number; range: Range; live?: boolean; dayHigh?: number; dayLow?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const vals = points.map((p) => p.v);
    const ref = range === "1d" ? base : points[0].v;
    let min = Math.min(...vals, range === "1d" ? ref : Infinity);
    let max = Math.max(...vals, range === "1d" ? ref : -Infinity);
    const pad = (max - min) * 0.08 || max * 0.01;
    min -= pad;
    max += pad;
    // 1일: x축 = 09:00 ~ 15:30 기본, 시간외·NXT 거래가 이어지면 마지막 거래 시각까지 늘림
    let xOf: (p: Point, i: number) => number;
    if (range === "1d") {
      const d = kst(points[0].t);
      const nine = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0); // 09:00 KST
      const open = Math.min(nine, points[0].t);
      const close = Math.max(nine + 6.5 * 3600_000, points[points.length - 1].t);
      xOf = (p) => Math.min(1, Math.max(0, (p.t - open) / (close - open))) * W;
    } else xOf = (_p, i) => (i / (points.length - 1)) * W;
    const yOf = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * (H - PAD_T - PAD_B);
    const xy = points.map((p, i) => [xOf(p, i), yOf(p.v)] as const);
    const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const last = xy[xy.length - 1];
    const area = `${line} L${last[0].toFixed(1)} ${H} L${xy[0][0].toFixed(1)} ${H} Z`;
    // 최고·최저: 종가가 아닌 실제 고가·저가 기준 (1일은 NXT 포함 통합 값과 비교)
    const his = points.map((p) => p.hi ?? p.v), los = points.map((p) => p.lo ?? p.v);
    let hiV = Math.max(...his), loV = Math.min(...los);
    if (range === "1d") {
      if (dayHigh) hiV = Math.max(hiV, dayHigh);
      if (dayLow) loV = Math.min(loV, dayLow);
    }
    const hiI = his.indexOf(Math.max(...his));
    const loI = los.indexOf(Math.min(...los));
    return { xy, line, area, refY: yOf(ref), ref, hiI, loI, hiV, loV };
  }, [points, base, range, dayHigh, dayLow]);

  if (!geo) return <div className="grid h-[300px] place-items-center text-[14px] text-ink-3">차트 데이터를 불러오는 중…</div>;

  const lastV = points[points.length - 1].v;
  const up = lastV >= geo.ref;
  const color = up ? "var(--up)" : "var(--down)";
  const hi = hover != null ? points[hover] : null;
  const hxy = hover != null ? geo.xy[hover] : null;

  const onMove = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < geo.xy.length; i++) if (Math.abs(geo.xy[i][0] - x) < Math.abs(geo.xy[best][0] - x)) best = i;
    setHover(best);
  };

  const pct = (x: number) => `${(x / W) * 100}%`;
  const pctY = (y: number) => `${(y / H) * 100}%`;
  const end = geo.xy[geo.xy.length - 1];

  return (
    <div
      ref={box}
      className="relative h-[260px] touch-pan-y select-none sm:h-[300px]"
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerDown={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={`가격 차트, 현재 ${won(lastV)}원`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id="mv-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.16} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={0} x2={W} y1={geo.refY} y2={geo.refY} stroke="var(--ink-3)" strokeOpacity={0.45} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        <path d={geo.area} fill="url(#mv-area)" />
        <path d={geo.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hxy && <line x1={hxy[0]} x2={hxy[0]} y1={0} y2={H} stroke="var(--ink-3)" strokeOpacity={0.5} vectorEffect="non-scaling-stroke" />}
      </svg>

      {/* 기준선 라벨 */}
      <span className="num pointer-events-none absolute right-0 -translate-y-full rounded px-1 text-[11px] text-ink-3" style={{ top: pctY(geo.refY) }}>
        {range === "1d" ? "전일" : "시작"} {won(geo.ref)}
      </span>

      {/* 최고·최저 */}
      {hover == null && (
        <>
          <span className="num pointer-events-none absolute -translate-x-1/2 -translate-y-full pb-1 text-[11.5px] font-semibold text-up" style={{ left: `clamp(40px, ${pct(geo.xy[geo.hiI][0])}, calc(100% - 60px))`, top: pctY(geo.xy[geo.hiI][1]) }}>
            최고 {won(geo.hiV)}
          </span>
          <span className="num pointer-events-none absolute -translate-x-1/2 pt-1 text-[11.5px] font-semibold text-down" style={{ left: `clamp(40px, ${pct(geo.xy[geo.loI][0])}, calc(100% - 60px))`, top: pctY(geo.xy[geo.loI][1]) }}>
            최저 {won(geo.loV)}
          </span>
        </>
      )}

      {/* 현재가 점 (실시간이면 깜빡임) */}
      <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: pct(end[0]), top: pctY(end[1]) }}>
        {live && <span className="absolute inset-0 size-2.5 animate-ping rounded-full" style={{ background: color }} />}
        <span className="relative block size-2.5 rounded-full ring-2 ring-surface" style={{ background: color }} />
      </span>

      {/* 마우스 위치 정보 */}
      {hi && hxy && (
        <>
          <span className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface" style={{ left: pct(hxy[0]), top: pctY(hxy[1]), background: color }} />
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-center whitespace-nowrap text-bg shadow-lg"
            style={{ left: `clamp(70px, ${pct(hxy[0])}, calc(100% - 70px))` }}
          >
            <b className="num block text-[13.5px]">{won(hi.v)}원</b>
            <span className={cx("num block text-[11px] opacity-75")}>
              {label(hi.t, range)} · {hi.v >= geo.ref ? "+" : ""}{(((hi.v - geo.ref) / geo.ref) * 100).toFixed(2)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
