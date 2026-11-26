"use client";
import Link from "next/link";
import { REGIONS, type Region } from "@/lib/issues";
import { useLive } from "@/lib/live-client";
import { Icon } from "@/components/ui/icons";
import { RankDelta } from "@/components/ui/kit";

/** 상단 고정 — 대륙별 상위 키워드가 흐르는 뉴스 키워드 띠 */
export function KeywordTicker() {
  const live = useLive();
  const items = (Object.keys(REGIONS) as Region[]).flatMap((r) =>
    live.trends[r].slice(0, 4).flatMap((t) => {
      const is = live.issue(t.id);
      return is ? [{ ...t, r, is }] : [];
    }),
  );
  const row = (dup: boolean) =>
    items.map((t) => {
      const is = t.is;
      return (
        <Link key={(dup ? "b" : "a") + t.id} href={`/issue/${t.id}`} tabIndex={dup ? -1 : undefined} aria-hidden={dup || undefined}
          className="group inline-flex shrink-0 items-center gap-2 px-4 text-[13px] whitespace-nowrap">
          <span aria-hidden>{REGIONS[t.r].flag}</span>
          <span className="num font-bold text-ink-3">{t.rank}</span>
          <span className="font-semibold text-ink-2 transition group-hover:text-ink group-hover:underline group-hover:underline-offset-4">{is.keyword}</span>
          <RankDelta delta={t.delta} isNew={t.isNew} />
        </Link>
      );
    });

  return (
    <div className="flex h-10 items-center border-t border-line/70">
      <div className="mx-auto flex w-full max-w-[1320px] items-center pl-4 sm:pl-6 lg:pl-8">
        <span className="z-10 inline-flex shrink-0 items-center gap-1.5 pr-3 text-[12px] font-bold">
          <Icon name="bolt" className="size-3.5 text-up" />
          <span className="hidden sm:inline">글로벌 </span>핫 키워드
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_24px,#000_calc(100%-48px),transparent)]">
          {items.length ? (
            <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
              {row(false)}
              {row(true)}
            </div>
          ) : (
            <span className="px-4 text-[13px] text-ink-3">실시간 뉴스 키워드를 모으는 중…</span>
          )}
        </div>
      </div>
    </div>
  );
}
