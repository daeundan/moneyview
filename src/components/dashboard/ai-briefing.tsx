"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { REGIONS, type Issue, type Region } from "@/lib/issues";
import { useNow } from "@/lib/hooks";
import { moodLabel, moodOf, useLive } from "@/lib/live-client";
import { fmtDate, fmtHM } from "@/lib/format";
import { Gauge, SettleNumber } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";

/** 영향이 큰 이슈 순 (기사량 × 점수 강도) */
const weight = (x: Issue) => x.articles * (Math.abs(x.score) + 20);

function headlineOf(issues: Issue[]) {
  if (!issues.length) return "오늘의 뉴스를 읽고 핵심을 정리하고 있어요…";
  const [a, b] = [...issues].sort((x, y) => weight(y) - weight(x));
  const m = moodOf(issues);
  return `오늘 시장의 중심은 '${a.keyword}'${b ? `와 '${b.keyword}'` : ""} — 전반적으로 ${moodLabel(m)} 분위기예요`;
}

/** 타이핑 효과 */
function useTyping(text: string, speed = 28) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((x) => x + 1), speed);
    return () => clearTimeout(t);
  }, [n, text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function Typed({ text }: { text: string }) {
  const { shown, done } = useTyping(text);
  return (
    <>
      {shown}
      {!done && <span className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[3px] animate-caret bg-[#a78bfa]" />}
    </>
  );
}

export function AiBriefing({ name }: { name: string }) {
  const now = useNow(60_000);
  const live = useLive();
  const headline = headlineOf(live.issues);
  const takeaways = [...live.issues].sort((x, y) => weight(y) - weight(x)).slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#0c0d10] p-6 text-[#f2f3f5] sm:p-8 lg:col-span-8">
      <div className="grid-lines pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_80%_0%,#000_10%,transparent_65%)]" />
      <div className="animate-orb pointer-events-none absolute -top-40 -right-40 size-[460px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(124,92,255,.35),transparent_62%)]" />
      <div className="animate-orb pointer-events-none absolute -bottom-56 left-1/4 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.14),transparent_62%)] [animation-duration:19s]" />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.06] px-3 text-[12px] font-bold backdrop-blur">
            <Icon name="sparkle" className="size-3.5 text-[#a78bfa]" />
            <span className="text-[#c4b5fd]">AI 데일리 마켓 브리핑</span>
          </span>
          <span className="text-[12.5px] text-[#7d838e]">{live.loaded ? `${fmtDate(new Date(live.updatedAt))} ${fmtHM(new Date(live.updatedAt))} 업데이트 · 기사 ${live.articleCount.toLocaleString()}건 분석` : now ? `${fmtDate(now)} · 뉴스 수집 중` : "뉴스 수집 중"}</span>
        </div>

        <p className="mt-4 text-[13.5px] text-[#9aa0ab]">{name}님, 오늘 시장의 핵심은 이거예요.</p>
        <h1 className="mt-1.5 min-h-[3.2em] text-[22px] leading-[1.4] font-extrabold tracking-[-0.03em] sm:text-[27px]">
          <Typed key={headline} text={headline} />
        </h1>

        <ol className="mt-5 grid grid-cols-1 gap-2">
          {!live.loaded && [0, 1, 2].map((k) => <li key={k} className="h-[50px] animate-pulse rounded-xl bg-white/[.05]" />)}
          {takeaways.map((t, k) => (
            <li key={t.id} className="animate-rise" style={{ animationDelay: `${0.3 + k * 0.08}s` }}>
              <Link href={`/issue/${t.id}`} className="group flex items-start gap-3 rounded-xl border border-white/[.06] bg-white/[.035] px-4 py-3 transition hover:border-white/15 hover:bg-white/[.07]">
                <span className="num mt-px grid size-5 shrink-0 place-items-center rounded-md bg-white/10 text-[11px] font-bold">{k + 1}</span>
                <span className="flex-1 text-[14px] leading-relaxed text-[#d7dae0]">
                  <b className="mr-1.5 font-bold text-white">{t.keyword}</b>
                  {t.headline}
                </span>
                <Icon name="chevR" className="mt-0.5 size-4 shrink-0 text-[#5f6570] transition group-hover:translate-x-0.5 group-hover:text-white" />
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/[.07] pt-5 sm:grid-cols-4">
          {(Object.keys(REGIONS) as Region[]).map((r) => {
            const b = live.briefs[r];
            return (
              <div key={r} className="min-w-0">
                <div className="flex items-center justify-between text-[12px] text-[#7d838e]">
                  <span>{REGIONS[r].flag} {REGIONS[r].label}</span>
                  <b className={"num font-bold " + (b.mood > 0 ? "text-[#ff6b70]" : b.mood < 0 ? "text-[#5f9bff]" : "text-[#9aa0ab]")}>{b.mood > 0 ? "+" : ""}{b.mood}</b>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.08]">
                  <span className="block h-full rounded-full bg-gradient-to-r from-[#7c5cff] to-[#22d3ee]" style={{ width: `${50 + b.mood}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MoodCard() {
  const live = useLive();
  const GLOBAL_MOOD = moodOf(live.issues);
  const COUNTS = {
    pos: live.issues.filter((x) => x.score >= 15).length,
    mid: live.issues.filter((x) => x.score > -15 && x.score < 15).length,
    neg: live.issues.filter((x) => x.score <= -15).length,
  };
  return (
    <section className="card flex flex-col p-6 lg:col-span-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold tracking-tight">AI 글로벌 투자심리</h3>
        <span className="text-[12px] text-ink-3">-100 ~ +100</span>
      </div>
      <div className="mt-4 flex flex-1 flex-col items-center justify-center">
        {/* 데이터가 오면 왼쪽 끝에서 차오르기 시작 */}
        <Gauge value={live.loaded ? GLOBAL_MOOD : -100} size={230} label="투자심리" />
        <div className="-mt-2 text-center">
          <SettleNumber value={live.loaded ? GLOBAL_MOOD : -100} className={"num block text-[34px] font-extrabold tracking-[-0.04em] " + (!live.loaded ? "invisible" : GLOBAL_MOOD >= 0 ? "text-up" : "text-down")} />
          <div className="text-[14px] font-semibold text-ink-2">{live.loaded ? moodLabel(GLOBAL_MOOD) : "계산 중…"}</div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[["호재 이슈", COUNTS.pos, "text-up"], ["중립", COUNTS.mid, "text-ink-2"], ["악재 이슈", COUNTS.neg, "text-down"]].map(([k, v, c]) => (
          <div key={k} className="rounded-xl bg-surface-2 py-2.5">
            <dt className="text-[11.5px] text-ink-3">{k}</dt>
            <dd className={"num mt-0.5 text-[18px] font-bold " + c}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-3">
        <Icon name="sparkle" className="mt-0.5 size-3.5 shrink-0 text-ai" />
        기사 제목의 긍정·부정 표현으로 이슈별 점수를 매기고, 기사량으로 가중 평균했어요.
      </p>
    </section>
  );
}
