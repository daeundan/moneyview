"use client";
import Link from "next/link";
import { REGIONS, type Region } from "@/lib/issues";
import { useLive } from "@/lib/live-client";
import { useNow } from "@/lib/hooks";
import { cx, fmtDate } from "@/lib/format";
import { AiBadge, ScorePill } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";
import { ImpactBoard } from "@/components/dashboard/impact-board";

export function ReportsView() {
  const now = useNow(60_000);
  const live = useLive();
  const regions = Object.keys(REGIONS) as Region[];
  return (
    <div>
      <header className="mb-7 animate-rise">
        <AiBadge label="AI 리포트" />
        <h1 className="mt-3 text-[28px] font-extrabold tracking-[-0.04em] sm:text-[34px]">대륙별 AI 시황 리포트</h1>
        <p className="mt-1.5 text-[15px] text-ink-3">{now ? fmtDate(now) : "----.--.--"} 기준 · 대륙별 국내 언론 보도를 모아 증권시장 관점에서 정리했어요.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {regions.map((r, i) => {
          const b = live.briefs[r];
          const top = live.issues.filter((x) => x.region === r).sort((a, c) => c.articles - a.articles).slice(0, 3);
          const pos = top.filter((x) => x.score > 0).length;
          const neg = top.filter((x) => x.score < 0).length;
          return (
            <section key={r} className="card animate-rise overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="relative border-b border-line p-6">
                <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ai-1)_14%,transparent),transparent_65%)]" />
                <div className="relative flex items-center justify-between">
                  <h2 className="text-[19px] font-bold tracking-tight">{REGIONS[r].flag} {REGIONS[r].label} <span className="text-[13px] font-medium text-ink-3">{REGIONS[r].en}</span></h2>
                  <span className={cx("num rounded-lg px-2.5 py-1 text-[13px] font-bold", b.mood > 0 ? "bg-up/10 text-up" : b.mood < 0 ? "bg-down/10 text-down" : "bg-surface-2 text-ink-3")}>
                    투자심리 {b.mood > 0 ? "+" : ""}{b.mood}
                  </span>
                </div>
                <p className="relative mt-3 flex items-start gap-2 text-[15px] leading-relaxed font-semibold">
                  <Icon name="sparkle" className="mt-1 size-4 shrink-0 text-ai" />
                  {b.line}
                </p>
                <p className="relative mt-2 text-[13px] text-ink-3">주요 이슈 {top.length}건 중 호재 {pos}건 · 악재 {neg}건</p>
              </div>
              <ul className="p-2">
                {top.map((x) => (
                  <li key={x.id}>
                    <Link href={`/issue/${x.id}`} className="group flex items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold group-hover:underline group-hover:underline-offset-4">{x.keyword}</span>
                        <span className="block truncate text-[12.5px] text-ink-3">{x.headline}</span>
                      </span>
                      <ScorePill score={x.score} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-12">
        <ImpactBoard title="전체 이슈 AI 분석" showAll />
      </div>
    </div>
  );
}
