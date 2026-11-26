"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers";
import { Brand, LiveDot } from "@/components/ui/kit";
import { Icon, type IconName } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { KeywordTicker } from "@/components/dashboard/keyword-ticker";
import { useNow } from "@/lib/hooks";
import { cx, fmtTime } from "@/lib/format";

const NAV: [string, string, IconName][] = [
  ["/dashboard", "대시보드", "grid"],
  ["/market", "국내주식", "chart"],
  ["/reports", "AI 리포트", "doc"],
  ["/me", "내 정보", "user"],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { ready, user, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const now = useNow();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user)
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex items-center gap-3 text-ink-3"><span className="size-5 animate-spin rounded-full border-2 border-line border-t-ink" />불러오는 중…</div>
      </div>
    );

  const active = (href: string) => path === href || (href === "/dashboard" && path.startsWith("/issue")) || (href === "/market" && path.startsWith("/stock"));

  return (
    <div className="min-h-dvh pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" aria-label="머니뷰 홈"><Brand /></Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="주 메뉴">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href}
                className={cx("rounded-xl px-3.5 py-2 text-[14.5px] font-semibold transition", active(href) ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink")}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <span className="hidden h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] font-semibold sm:inline-flex">
              <LiveDot /> 실시간 <b className="num w-[62px] font-semibold text-ink-2">{now ? fmtTime(now) : "--:--:--"}</b>
            </span>
            <ThemeToggle />
            <div className="hidden items-center gap-2 border-l border-line pl-3 md:flex">
              <span className="grid size-9 place-items-center rounded-full bg-ink text-[13px] font-bold text-bg">{user.name.slice(-2)}</span>
              <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium text-ink-3 transition hover:bg-surface-2 hover:text-ink">
                <Icon name="logout" className="size-4" />로그아웃
              </button>
            </div>
          </div>
        </div>
        <KeywordTicker />
      </header>

      <main className="mx-auto max-w-[1320px] px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-8">{children}</main>

      <footer className="mx-auto hidden max-w-[1320px] px-8 pb-10 text-[12.5px] leading-relaxed text-ink-3 md:block">
        본 서비스의 정보는 AI가 여러 기사를 요약·분석한 참고 자료이며 투자 권유가 아닙니다. 투자 판단의 책임은 이용자에게 있습니다. · 뉴스: 구글 뉴스·연합뉴스·한국경제 RSS(제목·링크만 사용) · 시세: 국내 네이버 금융(실시간) · 해외 Yahoo Finance(15~20분 지연)
      </footer>

      <nav aria-label="하단 메뉴" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4">
          {NAV.map(([href, label, icon]) => (
            <Link key={href} href={href} className={cx("flex h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition", active(href) ? "text-ink" : "text-ink-3")}>
              <Icon name={icon} className="size-[22px]" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
