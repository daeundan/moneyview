"use client";
import { CATEGORIES, REGIONS, type Category, type Region } from "@/lib/issues";
import { useSettle } from "@/lib/use-settle";
import { cx, scoreLabel } from "@/lib/format";
import { Icon } from "./icons";

export function Logo({ size = 32, invert = false }: { size?: number; invert?: boolean }) {
  return (
    <span className={cx("inline-grid shrink-0", invert ? "text-white" : "text-ink")} style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9.5" fill="currentColor" />
        <path d="M8 20.5l5-5 4 3 6.5-7.5" fill="none" stroke={invert ? "#0c0d10" : "var(--bg)"} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23.6" cy="10.6" r="2.2" fill={invert ? "#0c0d10" : "var(--bg)"} />
      </svg>
    </span>
  );
}

export function Brand({ invert = false, size = 30 }: { invert?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} invert={invert} />
      <span className="text-[18px] font-extrabold tracking-[-0.03em]">머니뷰</span>
    </span>
  );
}

/** AI 표시 배지 */
export function AiBadge({ label = "AI 분석", className }: { label?: string; className?: string }) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-bold text-white", className)}
      style={{ background: "linear-gradient(110deg, var(--ai-1), var(--ai-2) 60%, var(--ai-3))" }}>
      <Icon name="sparkle" className="size-3.5" />
      {label}
    </span>
  );
}

export function CatBadge({ c }: { c: Category }) {
  return <span className={cx("inline-flex h-6 items-center rounded-md px-2 text-[11.5px] font-semibold whitespace-nowrap", CATEGORIES[c].tone)}>{CATEGORIES[c].label}</span>;
}

export function RegionBadge({ r }: { r: Region }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md bg-surface-2 px-2 text-[11.5px] font-semibold text-ink-2 whitespace-nowrap">
      <span aria-hidden>{REGIONS[r].flag}</span>
      {REGIONS[r].label}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cx("relative inline-flex size-2", className)}>
      <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-up opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-up" />
    </span>
  );
}

/** 순위 변동 표시 (네이버 실검 스타일) */
export function RankDelta({ delta, isNew }: { delta: number; isNew: boolean }) {
  if (isNew) return <span className="text-[10.5px] font-extrabold tracking-wide text-up">NEW</span>;
  if (delta > 0) return <span className="num text-[12px] font-semibold text-up">▲{delta}</span>;
  if (delta < 0) return <span className="num text-[12px] font-semibold text-down">▼{-delta}</span>;
  return <span className="text-[12px] text-ink-3">–</span>;
}

export function Sparkline({ data, up, width = 96, height = 30, area = false, className }: { data: number[]; up: boolean; width?: number; height?: number; area?: boolean; className?: string }) {
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1, n = data.length - 1;
  const pts = data.map((v, k) => [(k / n) * width, 2 + (1 - (v - min) / r) * (height - 4)]);
  const d = pts.map((p, k) => `${k ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const color = up ? "var(--up)" : "var(--down)";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className} width={width} height={height} aria-hidden="true">
      {area && <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={color} opacity={0.1} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** -100 ~ 100 증시 영향 점수 막대 (가운데 기준 양방향, 흔들리다 멈추는 애니메이션) */
export function ImpactBar({ score, className }: { score: number; className?: string }) {
  const v = useSettle(score, 0, { fill: 700, wobble: 1100 });
  const w = Math.min(Math.abs(v), 100) / 2;
  return (
    <div className={cx("relative h-1.5 w-full rounded-full bg-surface-2", className)} role="img" aria-label={`증시 영향 ${score > 0 ? "+" : ""}${score}`}>
      <span className="absolute top-[-3px] left-1/2 h-3 w-px bg-line" />
      <span className={cx("absolute top-0 h-full rounded-full", v >= 0 ? "bg-up" : "bg-down")}
        style={v >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }} />
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const tone = score >= 15 ? "bg-up/10 text-up" : score <= -15 ? "bg-down/10 text-down" : "bg-surface-2 text-ink-2";
  return (
    <span className={cx("num inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-bold whitespace-nowrap", tone)}>
      {scoreLabel(score)} {score > 0 ? "+" : ""}{score}
    </span>
  );
}

/** 반원 게이지 (-100 ~ 100) — 왼쪽 끝에서 차오른 뒤 목표 근처에서 흔들리다 멈춤 */
export function Gauge({ value, size = 200, dark = false, label }: { value: number; size?: number; dark?: boolean; label?: string }) {
  const v = useSettle(value);
  const r = 80, c = Math.PI * r, k = (Math.max(-100, Math.min(100, v)) + 100) / 200;
  const ang = Math.PI * (1 - k);
  const nx = 100 + Math.cos(ang) * 64, ny = 100 - Math.sin(ang) * 64;
  return (
    <svg viewBox="0 0 200 116" width={size} className="max-w-full" role="img" aria-label={`${label ?? "지수"} ${value}`}>
      <defs>
        <linearGradient id={`g-${dark ? "d" : "l"}`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--down)" />
          <stop offset=".5" stopColor={dark ? "#3a3f47" : "#c4c9d2"} />
          <stop offset="1" stopColor="var(--up)" />
        </linearGradient>
      </defs>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={dark ? "rgba(255,255,255,.08)" : "var(--surface-2)"} strokeWidth="14" strokeLinecap="round" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={`url(#g-${dark ? "d" : "l"})`} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c * k} ${c}`} />
      <line x1="100" y1="100" x2={nx} y2={ny} stroke={dark ? "#fff" : "var(--ink)"} strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill={dark ? "#fff" : "var(--ink)"} />
    </svg>
  );
}

/** 게이지와 같은 박자로 움직이는 숫자 */
export function SettleNumber({ value, className }: { value: number; className?: string }) {
  const v = Math.round(useSettle(value));
  return <span className={className}>{v > 0 ? "+" : ""}{v}</span>;
}

export function SectionHead({ title, desc, right, ai }: { title: string; desc?: string; right?: React.ReactNode; ai?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-[19px] font-bold tracking-[-0.03em]">
          {title}
          {ai && <AiBadge />}
        </h2>
        {desc && <p className="mt-1 text-[13.5px] text-ink-3">{desc}</p>}
      </div>
      {right}
    </div>
  );
}
