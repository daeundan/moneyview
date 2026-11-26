"use client";
import { REGIONS, type Region } from "@/lib/issues";
import { useLive } from "@/lib/live-client";
import { Brand, LiveDot, RankDelta } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";

export function AuthSide() {
  const live = useLive();
  const regions = Object.keys(REGIONS) as Region[];

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0c0d10] px-14 py-12 text-[#f2f3f5] lg:flex">
      <div className="grid-lines pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_30%,#000_10%,transparent_70%)]" />
      <div className="animate-orb pointer-events-none absolute -top-52 -right-64 size-[620px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(124,92,255,.32),transparent_60%)]" />
      <div className="animate-orb pointer-events-none absolute -bottom-80 -left-72 size-[620px] rounded-full bg-[radial-gradient(circle_at_60%_40%,rgba(34,211,238,.16),transparent_60%)] [animation-duration:18s]" />

      <div className="relative animate-fade"><Brand invert size={34} /></div>

      <div className="relative">
        <h2 className="animate-rise text-[44px] leading-[1.2] font-extrabold tracking-[-0.04em]">
          세계의 뉴스를<br />
          <span className="text-[#B9A6FF]">AI가 읽고,</span> 시장을<br />
          먼저 말합니다.
        </h2>
        <p className="mt-5 mb-10 animate-rise text-[16px] text-[#9aa0ab] [animation-delay:.1s]">
          실적발표 · 전쟁 소식 · 산업 변화까지.<br />기사 원문 대신 AI가 정리한 증시 영향 리포트를 받아보세요.
        </p>

        <div className="max-w-[460px] rounded-2xl border border-white/[.07] bg-white/[.04] p-5 backdrop-blur-md animate-rise [animation-delay:.2s]">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#c9cdd4]">
            <LiveDot /> 지금 대륙별 1위 키워드
          </div>
          <ul className="divide-y divide-white/[.06]">
            {regions.map((r) => {
              const top = live.trends[r][0];
              const is = top && live.issue(top.id);
              return (
                <li key={r} className="flex items-center gap-3 py-3">
                  <span className="w-16 shrink-0 text-[12.5px] text-[#7d838e]">{REGIONS[r].flag} {REGIONS[r].label}</span>
                  {is ? (
                    <>
                      <span key={is.id} className="flex-1 truncate font-semibold animate-fade">{is.keyword}</span>
                      <RankDelta delta={top.delta} isNew={top.isNew} />
                    </>
                  ) : (
                    <span className="h-4 flex-1 animate-pulse rounded bg-white/[.08]" />
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[.04] p-3 text-[12.5px] leading-relaxed text-[#9aa0ab]">
            <Icon name="sparkle" className="mt-0.5 size-4 shrink-0 text-[#a78bfa]" />
            키워드를 누르면 기사 원문이 아닌, AI가 여러 기사를 요약하고 증시 영향을 분석한 페이지로 이동해요.
          </div>
        </div>
      </div>

      <p className="relative text-[13px] text-[#5f6570]">© 2026 MoneyView · 뉴스: 구글 뉴스·연합뉴스·한국경제 RSS · 시세: 네이버 금융 · Yahoo Finance</p>
    </aside>
  );
}
