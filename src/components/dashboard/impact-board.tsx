"use client";
import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, type Category, type Issue } from "@/lib/issues";
import { useLive } from "@/lib/live-client";
import { cx } from "@/lib/format";
import { CatBadge, ImpactBar, RegionBadge, ScorePill, SectionHead } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";

export function IssueCard({ is, i = 0 }: { is: Issue; i?: number }) {
  return (
    <Link href={`/issue/${is.id}`} style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
      className="card group flex animate-rise flex-col p-5 transition hover:-translate-y-0.5 hover:border-ink-3/40">
      <div className="flex flex-wrap items-center gap-1.5">
        <RegionBadge r={is.region} />
        <CatBadge c={is.category} />
        <span className="ml-auto"><ScorePill score={is.score} /></span>
      </div>
      <h3 className="mt-3 text-[16px] leading-snug font-bold tracking-tight group-hover:underline group-hover:underline-offset-4">{is.headline}</h3>
      <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{is.summary}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-ink-3"><span>악재</span><span>증시 영향</span><span>호재</span></div>
        <ImpactBar score={is.score} />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {is.sectors.map(([s, d]) => (
          <span key={s} className={cx("inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[12px] font-medium",
            d > 0 ? "border-up/25 text-up" : d < 0 ? "border-down/25 text-down" : "border-line text-ink-3")}>
            {d > 0 ? "▲" : d < 0 ? "▼" : "–"} {s}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between pt-4 text-[12px] text-ink-3">
        <span className="inline-flex items-center gap-1"><Icon name="newspaper" className="size-3.5" />기사 {is.articles}건 종합</span>
        <span className="inline-flex items-center gap-0.5 font-semibold text-ink-2 transition group-hover:text-ink">AI 리포트 보기<Icon name="chevR" className="size-3.5" /></span>
      </div>
    </Link>
  );
}

const TABS: ("all" | Category)[] = ["all", "earnings", "geo", "industry", "policy", "commodity"];

export function ImpactBoard({ limit = 6, title = "증시 영향 AI 분석", showAll = false }: { limit?: number; title?: string; showAll?: boolean }) {
  const [cat, setCat] = useState<"all" | Category>("all");
  const [more, setMore] = useState(showAll);
  const live = useLive();
  const list = live.issues.filter((x) => cat === "all" || x.category === cat).sort((a, b) => Math.abs(b.score) * b.articles - Math.abs(a.score) * a.articles);
  const shown = more ? list : list.slice(0, limit);

  return (
    <section className="lg:col-span-12">
      <SectionHead title={title} ai desc="실적발표·전쟁·산업 변화 뉴스가 증권시장에 미칠 영향을 기사 표현과 키워드 사전으로 점수화했어요." />
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button key={t} onClick={() => setCat(t)}
            className={cx("h-9 shrink-0 rounded-full border px-4 text-[13.5px] font-semibold transition active:scale-95",
              cat === t ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-ink-3")}>
            {t === "all" ? "전체" : CATEGORIES[t].label}
          </button>
        ))}
      </div>
      <div key={cat} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!live.loaded && Array.from({ length: 3 }, (_, k) => <div key={k} className="card skeleton h-[260px]" />)}
        {shown.map((is, i) => <IssueCard key={is.id} is={is} i={i} />)}
        {live.loaded && !list.length && <p className="col-span-full py-10 text-center text-[14px] text-ink-3">이 분류에 해당하는 이슈가 아직 없어요.</p>}
      </div>
      {!more && list.length > limit && (
        <div className="mt-5 flex justify-center">
          <button onClick={() => setMore(true)} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface px-5 text-[14px] font-semibold transition hover:border-ink-3">
            {list.length - limit}개 이슈 더 보기
          </button>
        </div>
      )}
    </section>
  );
}

