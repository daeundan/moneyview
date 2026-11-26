"use client";
import Link from "next/link";
import { useState } from "react";
import { REGIONS, type Issue, type Region, type RegionBrief } from "@/lib/issues";
import type { RankItem } from "@/lib/trends";
import { useLive } from "@/lib/live-client";
import { cx, fmtHM } from "@/lib/format";
import { CatBadge, LiveDot, RankDelta, SectionHead } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";

const ROW = 52;
const KEYS = Object.keys(REGIONS) as Region[];

function RankList({ items, issue, loaded }: { items: RankItem[]; issue: (id: string) => Issue | undefined; loaded: boolean }) {
  if (!loaded)
    return (
      <ul aria-label="불러오는 중">
        {Array.from({ length: 6 }, (_, k) => (
          <li key={k} className="flex items-center gap-3 px-2.5" style={{ height: ROW }}>
            <span className="skeleton h-4 w-5 rounded" />
            <span className="skeleton h-4 flex-1 rounded" />
          </li>
        ))}
      </ul>
    );
  if (!items.length) return <p className="px-2.5 py-8 text-center text-[13px] text-ink-3">지금은 눈에 띄는 이슈가 없어요.</p>;
  return (
    <ol className="relative" style={{ height: items.length * ROW }}>
      {items.map((t) => {
        const is = issue(t.id);
        if (!is) return null;
        return (
          <li key={t.id} className="absolute inset-x-0 transition-transform duration-700 ease-out-expo" style={{ transform: `translateY(${(t.rank - 1) * ROW}px)`, height: ROW }}>
            <Link href={`/issue/${t.id}`} className="group flex h-full items-center gap-3 rounded-xl px-2.5 transition hover:bg-surface-2">
              <span className={cx("num w-5 text-center text-[15px] font-extrabold", t.rank <= 3 ? "text-ink" : "text-ink-3")}>{t.rank}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-semibold group-hover:underline group-hover:underline-offset-4">{is.keyword}</span>
              </span>
              <span className="hidden xl:inline-flex"><CatBadge c={is.category} /></span>
              <span className="w-9 text-right"><RankDelta delta={t.delta} isNew={t.isNew} /></span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function RegionHeader({ r, b }: { r: Region; b: RegionBrief }) {
  return (
    <div className="mb-2 px-2.5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[16px] font-bold tracking-tight">
          <span aria-hidden>{REGIONS[r].flag}</span>
          {REGIONS[r].label}
          <span className="text-[12px] font-medium text-ink-3">{REGIONS[r].en}</span>
        </h3>
        <span className={cx("num text-[12px] font-bold", b.mood > 0 ? "text-up" : b.mood < 0 ? "text-down" : "text-ink-3")}>심리 {b.mood > 0 ? "+" : ""}{b.mood}</span>
      </div>
      <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-3">
        <Icon name="sparkle" className="mt-px size-3.5 shrink-0 text-ai" />
        {b.line}
      </p>
    </div>
  );
}

export function RegionRankings() {
  const live = useLive();
  const [tab, setTab] = useState<Region>("us");

  return (
    <section className="lg:col-span-12">
      <SectionHead
        title="대륙별 실시간 이슈 키워드"
        desc={`최근 24시간 국내 언론 기사 ${live.articleCount ? live.articleCount.toLocaleString() + "건" : ""}에서 많이 언급된 키워드예요. 5분마다 갱신되고, 누르면 요약 리포트로 이동해요.`}
        right={
          <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-3">
            <LiveDot />
            <span className="num">{live.loaded ? `${fmtHM(new Date(live.updatedAt))} 수집${live.source === "demo" ? " · 데모 데이터" : ""}` : "뉴스 수집 중"}</span>
          </span>
        }
      />

      {/* 모바일·태블릿: 탭 */}
      <div className="card p-3 lg:hidden">
        <div role="tablist" className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
          {KEYS.map((r) => (
            <button key={r} role="tab" aria-selected={tab === r} onClick={() => setTab(r)}
              className={cx("h-9 rounded-lg text-[13.5px] font-semibold transition", tab === r ? "bg-surface text-ink shadow-sm" : "text-ink-3")}>
              {REGIONS[r].label}
            </button>
          ))}
        </div>
        <div key={tab} className="animate-fade">
          <RegionHeader r={tab} b={live.briefs[tab]} />
          <RankList items={live.trends[tab]} issue={live.issue} loaded={live.loaded} />
        </div>
      </div>

      {/* 데스크톱: 4열 */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        {KEYS.map((r) => (
          <div key={r} className="card p-3 pt-4">
            <RegionHeader r={r} b={live.briefs[r]} />
            <RankList items={live.trends[r]} issue={live.issue} loaded={live.loaded} />
          </div>
        ))}
      </div>
    </section>
  );
}
