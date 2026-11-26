"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORIES, REGIONS, type Issue } from "@/lib/issues";
import { useNow, usePoll } from "@/lib/hooks";
import { ago, useLive } from "@/lib/live-client";
import { cx, fmtDate, scoreLabel } from "@/lib/format";
import { AiBadge, CatBadge, Gauge, ImpactBar, RegionBadge, ScorePill } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";

const STEPS = ["관련 기사 수집", "중복·광고성 기사 제거", "핵심 문장 추출 · 요약", "섹터·종목 영향 분석"];

/** AI가 분석하는 과정을 보여주는 짧은 연출 */
function Analyzing({ articles, onDone }: { articles: number; onDone: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(onDone, 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 330);
    return () => clearTimeout(t);
  }, [step, onDone]);
  return (
    <div className="ai-border ai-glow mx-auto mt-6 max-w-[560px] rounded-3xl p-6 sm:p-8" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative grid size-11 place-items-center rounded-2xl text-white" style={{ background: "linear-gradient(135deg,var(--ai-1),var(--ai-2))" }}>
          <Icon name="sparkle" className="size-5 animate-pulse" />
        </span>
        <div>
          <b className="ai-text text-[16px] font-bold">AI가 기사를 분석하고 있어요</b>
          <p className="text-[13px] text-ink-3">{articles ? `관련 기사 ${articles}건을 읽는 중…` : "관련 기사를 찾는 중…"}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {STEPS.map((s, k) => (
          <li key={s} className={cx("flex items-center gap-3 text-[14px] transition", k <= step ? "text-ink" : "text-ink-3/60")}>
            <span className={cx("grid size-5 place-items-center rounded-full border transition", k < step ? "border-transparent bg-ink text-bg" : k === step ? "border-ai" : "border-line")}>
              {k < step ? <Icon name="check" className="size-3" strokeWidth={3} /> : k === step ? <span className="size-2 animate-ping rounded-full bg-ai" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-6 space-y-2.5">
        <div className="skeleton h-3.5 w-11/12 rounded-full" />
        <div className="skeleton h-3.5 w-full rounded-full" />
        <div className="skeleton h-3.5 w-3/4 rounded-full" />
      </div>
    </div>
  );
}

export function IssueView({ id }: { id: string }) {
  const { data, updatedAt } = usePoll<{ issue: Issue | null }>(`/api/issue/${id}`, 300_000, { issue: null });
  const [ready, setReady] = useState(false);
  if (!data.issue)
    return updatedAt == null ? (
      <Analyzing articles={0} onDone={() => {}} />
    ) : (
      <div className="mx-auto mt-16 max-w-[460px] text-center">
        <h1 className="text-[22px] font-bold">이슈를 찾을 수 없어요</h1>
        <p className="mt-2 text-[14px] text-ink-3">오래된 키워드이거나 서버가 다시 시작돼 기록이 사라졌어요.</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-[14px] font-semibold text-bg">대시보드로</Link>
      </div>
    );
  return <IssueBody is={data.issue} ready={ready} onReady={() => setReady(true)} />;
}

function IssueBody({ is, ready, onReady }: { is: Issue; ready: boolean; onReady: () => void }) {
  const now = useNow(60_000);
  const live = useLive();
  const related = live.issues.filter((x) => x.region === is.region && x.id !== is.id).slice(0, 5);
  const conf = Math.min(96, 70 + Math.round(is.articles / 8));
  const sentences = is.summary.split(/(?<=다\.)\s+/);

  const scenarios = [
    { k: "낙관", p: is.score > 0 ? 35 : 20, t: is.score > 0 ? `${is.sectors.find((s) => s[1] > 0)?.[0] ?? "관련 섹터"} 중심으로 추세적 상승 가능` : "우려가 빠르게 해소되며 낙폭 만회", c: "text-up" },
    { k: "기본", p: is.score > 0 ? 45 : 50, t: is.score > 0 ? "단기 기대감 반영 후 실제 지표 확인까지 박스권" : "단기 변동성 확대 후 점진적 안정", c: "text-ink" },
    { k: "비관", p: is.score > 0 ? 20 : 30, t: is.score > 0 ? "기대 선반영에 따른 차익 실현 매물 출회" : `${is.sectors.find((s) => s[1] < 0)?.[0] ?? "관련 섹터"} 중심으로 하락 압력 확대`, c: "text-down" },
  ];

  return (
    <article className="mx-auto max-w-[1120px]">
      <title>{`${is.keyword} — 요약 리포트 · 머니뷰`}</title>
      <Link href="/dashboard" className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-ink-3 transition hover:bg-surface-2 hover:text-ink">
        <Icon name="chevL" className="size-4" />대시보드
      </Link>

      <header className="mt-3 animate-rise">
        <div className="flex flex-wrap items-center gap-1.5">
          <AiBadge label="AI 요약 리포트" />
          <RegionBadge r={is.region} />
          <CatBadge c={is.category} />
        </div>
        <h1 className="mt-3 text-[30px] leading-tight font-extrabold tracking-[-0.04em] sm:text-[38px]">{is.keyword}</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-2 sm:text-[17px]">{is.headline}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
          <span className="inline-flex items-center gap-1"><Icon name="clock" className="size-3.5" />{now ? fmtDate(now) : "----.--.--"} 생성</span>
          <span className="inline-flex items-center gap-1"><Icon name="newspaper" className="size-3.5" />기사 {is.articles}건 종합</span>
          <span className="inline-flex items-center gap-1"><Icon name="shield" className="size-3.5" />분석 신뢰도 {conf}%</span>
        </div>
      </header>

      {!ready ? (
        <Analyzing articles={is.articles} onDone={onReady} />
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            {/* AI 3줄 요약 */}
            <section className="ai-border ai-glow relative animate-rise overflow-hidden rounded-3xl p-6 sm:p-7">
              <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ai-1)_18%,transparent),transparent_65%)]" />
              <h2 className="relative flex items-center gap-2 text-[15px] font-bold">
                <Icon name="sparkle" className="size-4 text-ai" /><span className="ai-text">AI 핵심 요약</span>
              </h2>
              <ol className="relative mt-4 space-y-3">
                {[...sentences, is.points[2]].slice(0, 3).map((s, k) => (
                  <li key={k} className="flex gap-3 text-[16px] leading-[1.7]">
                    <span className="num mt-[3px] grid size-6 shrink-0 place-items-center rounded-lg bg-ink text-[12px] font-bold text-bg">{k + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* 핵심 포인트 */}
            <section className="card animate-rise p-6 [animation-delay:.06s]">
              <h2 className="text-[17px] font-bold tracking-tight">AI가 짚은 체크 포인트</h2>
              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {is.points.map((p, k) => (
                  <li key={p} className="rounded-2xl bg-surface-2 p-4">
                    <span className="text-[11.5px] font-bold text-ink-3">POINT {k + 1}</span>
                    <p className="mt-1.5 text-[14px] leading-relaxed font-medium">{p}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* 증권시장 영향 분석 */}
            <section className="card animate-rise p-6 [animation-delay:.12s]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight">증권시장 영향 분석 <AiBadge /></h2>
                <ScorePill score={is.score} />
              </div>
              <div className="mt-5 divide-y divide-line">
                {is.sectors.map(([s, d, why]) => (
                  <div key={s} className="flex items-center gap-4 py-3.5">
                    <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl text-[15px] font-bold",
                      d > 0 ? "bg-up/10 text-up" : d < 0 ? "bg-down/10 text-down" : "bg-surface-2 text-ink-3")}>
                      {d > 0 ? "▲" : d < 0 ? "▼" : "–"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="text-[15px] font-semibold">{s}</b>
                      <p className="text-[13px] text-ink-3">{why}</p>
                    </div>
                    <span className={cx("shrink-0 text-[13px] font-bold", d > 0 ? "text-up" : d < 0 ? "text-down" : "text-ink-3")}>
                      {d > 0 ? "수혜" : d < 0 ? "부담" : "중립"}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="mt-6 mb-3 text-[14px] font-bold text-ink-2">시나리오별 전망</h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {scenarios.map((sc) => (
                  <div key={sc.k} className="rounded-2xl border border-line p-4">
                    <div className="flex items-center justify-between">
                      <b className={cx("text-[14px] font-bold", sc.c)}>{sc.k}</b>
                      <span className="num text-[12.5px] font-semibold text-ink-3">{sc.p}%</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                      <span className={cx("block h-full rounded-full", sc.k === "낙관" ? "bg-up" : sc.k === "비관" ? "bg-down" : "bg-ink")} style={{ width: `${sc.p}%` }} />
                    </div>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">{sc.t}</p>
                  </div>
                ))}
              </div>
            </section>

            {!!is.sources?.length && (
              <section className="card animate-rise p-6 [animation-delay:.18s]">
                <h2 className="text-[17px] font-bold tracking-tight">참고한 기사 <span className="num text-[14px] font-semibold text-ink-3">{is.sources.length}</span></h2>
                <p className="mt-1 text-[13px] text-ink-3">요약에 사용한 기사의 제목과 출처예요. 자세한 내용은 언론사 원문에서 확인하세요.</p>
                <ul className="mt-4 divide-y divide-line">
                  {is.sources.map((s) => (
                    <li key={s.link}>
                      <a href={s.link} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-[14px] leading-snug font-medium group-hover:underline group-hover:underline-offset-4">{s.title}</span>
                          <span className="mt-1 block text-[12px] text-ink-3">{s.press}{now && s.time ? ` · ${ago(s.time, now.getTime())}` : ""}</span>
                        </span>
                        <Icon name="chevR" className="mt-1 size-4 shrink-0 text-ink-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-4 text-[12.5px] leading-relaxed text-ink-3">
              <Icon name="info" className="mt-0.5 size-4 shrink-0" />
              {is.sources
                ? `기사 ${is.articles}건의 제목을 키워드 사전과 긍정·부정 표현으로 자동 분석한 리포트예요(무료 모드). 실제 기사 내용과 다를 수 있으며 투자 권유가 아닙니다.`
                : `데모용 예시 리포트예요. 실제 기사 내용이 아니며 투자 권유가 아닙니다.`}
            </p>
          </div>

          {/* 사이드 */}
          <aside className="space-y-5 lg:col-span-4">
            <section className="card animate-rise p-6 text-center [animation-delay:.04s] lg:sticky lg:top-[124px]">
              <h2 className="text-left text-[15px] font-bold">증시 영향 점수</h2>
              <div className="mt-3 flex justify-center"><Gauge value={is.score} size={220} label="증시 영향" /></div>
              <div className={cx("num -mt-1 text-[36px] font-extrabold tracking-[-0.04em]", is.score >= 0 ? "text-up" : "text-down")}>
                {is.score > 0 ? "+" : ""}{is.score}
              </div>
              <div className="text-[14px] font-semibold text-ink-2">{scoreLabel(is.score)}</div>
              <div className="mt-4"><ImpactBar score={is.score} /></div>
              <div className="mt-1.5 flex justify-between text-[11px] text-ink-3"><span>-100 악재</span><span>+100 호재</span></div>

              <h3 className="mt-6 mb-2 text-left text-[14px] font-bold">관련 종목·지표</h3>
              <ul className="divide-y divide-line text-left">
                {is.tickers.map(([n, d]) => (
                  <li key={n} className="flex items-center justify-between py-2.5 text-[14px]">
                    <span className="font-medium">{n}</span>
                    <span className={cx("rounded-md px-2 py-0.5 text-[12px] font-bold", d > 0 ? "bg-up/10 text-up" : d < 0 ? "bg-down/10 text-down" : "bg-surface-2 text-ink-3")}>
                      {d > 0 ? "▲ 긍정" : d < 0 ? "▼ 부정" : "– 중립"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card animate-rise p-5 [animation-delay:.1s]">
              <h2 className="mb-2 text-[15px] font-bold">{REGIONS[is.region].flag} {REGIONS[is.region].label} 다른 이슈</h2>
              <ul>
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/issue/${r.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold group-hover:underline group-hover:underline-offset-4">{r.keyword}</span>
                        <span className="text-[12px] text-ink-3">{CATEGORIES[r.category].label}</span>
                      </span>
                      <span className={cx("num text-[12.5px] font-bold", r.score >= 0 ? "text-up" : "text-down")}>{r.score > 0 ? "+" : ""}{r.score}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </article>
  );
}
