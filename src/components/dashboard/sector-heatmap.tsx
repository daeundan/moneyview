"use client";
import { REGIONS, type Issue, type Region } from "@/lib/issues";
import { useLive } from "@/lib/live-client";
import { SectionHead } from "@/components/ui/kit";

/** 섹터 × 대륙 영향 히트맵 (-3 ~ +3) — 실시간 이슈의 섹터 영향을 합산 */
const tone = (v: number) =>
  v >= 3 ? "bg-up text-white" : v === 2 ? "bg-up/55 text-white" : v === 1 ? "bg-up/20 text-up"
  : v === 0 ? "bg-surface-2 text-ink-3" : v === -1 ? "bg-down/20 text-down" : v === -2 ? "bg-down/55 text-white" : "bg-down text-white";

const REGION_KEYS = Object.keys(REGIONS) as Region[];

function buildRows(issues: Issue[]) {
  const m = new Map<string, { v: Record<Region, number>; total: number; top?: Issue }>();
  for (const is of issues) {
    const w = (Math.abs(is.score) / 100) * Math.log2(1 + is.articles);
    for (const [name, d] of is.sectors) {
      const row = m.get(name) ?? { v: { us: 0, eu: 0, asia: 0, africa: 0 }, total: 0 };
      row.v[is.region] += d * w;
      row.total += w;
      if (!row.top || weightOf(is) > weightOf(row.top)) row.top = is;
      m.set(name, row);
    }
  }
  return [...m.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([name, r]) => ({
      name,
      v: Object.fromEntries(REGION_KEYS.map((k) => [k, Math.max(-3, Math.min(3, Math.round(r.v[k] * 0.9)))])) as Record<Region, number>,
      note: r.top ? `'${r.top.keyword}' 영향` : "",
    }));
}
const weightOf = (x: Issue) => x.articles * Math.abs(x.score);

export function SectorHeatmap() {
  const live = useLive();
  const rows = buildRows(live.issues);
  return (
    <section className="card p-5 sm:p-6 lg:col-span-7">
      <SectionHead title="섹터 × 대륙 영향 히트맵" ai desc="지금 수집된 이슈들이 각 지역 섹터에 미치는 방향과 강도예요." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] border-separate border-spacing-1 text-[13px]">
          <thead>
            <tr>
              <th className="w-[96px] pb-1 text-left text-[12px] font-medium text-ink-3">섹터</th>
              {REGION_KEYS.map((r) => <th key={r} className="pb-1 text-[12px] font-medium text-ink-3">{REGIONS[r].flag} {REGIONS[r].label}</th>)}
              <th className="hidden pb-1 pl-2 text-left text-[12px] font-medium text-ink-3 md:table-cell">주요 원인</th>
            </tr>
          </thead>
          <tbody>
            {!live.loaded &&
              Array.from({ length: 6 }, (_, k) => (
                <tr key={k}><td colSpan={6}><div className="skeleton h-10 rounded-lg" /></td></tr>
              ))}
            {rows.map(({ name, v, note }) => (
              <tr key={name}>
                <td className="pr-2 font-semibold">{name}</td>
                {REGION_KEYS.map((r) => (
                  <td key={r} className={"num h-10 rounded-lg text-center font-bold transition hover:scale-[1.04] " + tone(v[r])}>
                    {v[r] > 0 ? "+" : ""}{v[r]}
                  </td>
                ))}
                <td className="hidden max-w-[180px] truncate pl-2 text-[12.5px] text-ink-3 md:table-cell">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[11.5px] text-ink-3">
        악재
        {[-3, -2, -1, 0, 1, 2, 3].map((v) => <span key={v} className={"size-3.5 rounded " + tone(v).split(" ")[0]} />)}
        호재
      </div>
    </section>
  );
}
