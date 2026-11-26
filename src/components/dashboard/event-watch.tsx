"use client";
import Link from "next/link";
import { SectionHead } from "@/components/ui/kit";
import { CATEGORIES, REGIONS } from "@/lib/issues";
import { ago, useLive } from "@/lib/live-client";
import { useNow } from "@/lib/hooks";
import { cx } from "@/lib/format";

/** 실시간 헤드라인 — 수집된 기사 중 최신 순 (누르면 해당 이슈 요약 리포트로) */
export function EventWatch() {
  const live = useLive();
  const now = useNow(60_000);
  const seen = new Set<string>();
  const items = live.issues
    .flatMap((is) => (is.sources ?? []).slice(0, 3).map((s) => ({ ...s, is })))
    .sort((a, b) => b.time - a.time)
    .filter((x) => (seen.has(x.title) ? false : (seen.add(x.title), true)))
    .slice(0, 7);

  return (
    <section className="card p-5 sm:p-6 lg:col-span-5">
      <SectionHead title="방금 들어온 헤드라인" desc="이슈 키워드에 묶인 최신 기사예요. 누르면 원문 대신 요약 리포트를 보여줘요." />
      <ul className="space-y-1">
        {!live.loaded && Array.from({ length: 6 }, (_, k) => <li key={k} className="skeleton h-[54px] rounded-xl" />)}
        {items.map((e) => (
          <li key={e.link}>
            <Link href={`/issue/${e.is.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2">
              <span aria-hidden className="w-6 shrink-0 text-center text-[15px]">{REGIONS[e.is.region].flag}</span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-[14px] font-semibold group-hover:underline group-hover:underline-offset-4">{e.title}</span>
                <span className="text-[12px] text-ink-3">{e.press} · {now ? ago(e.time, now.getTime()) : ""} · {e.is.keyword}</span>
              </span>
              <span className={cx("shrink-0 rounded-md px-2 py-1 text-[11px] font-bold", CATEGORIES[e.is.category].tone)}>
                {CATEGORIES[e.is.category].label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
