"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/market";
import { usePoll } from "@/lib/hooks";
import { REGIONS } from "@/lib/issues";
import { cx, fmtNum, fmtTime } from "@/lib/format";
import { Sparkline } from "@/components/ui/kit";
import { Icon } from "@/components/ui/icons";

/** 누르면 이동할 곳 (국내 종목 → 종목 상세, 국내 지수 → 국내 주식 목록) */
const LINKS: Record<string, string> = { SEC: "/stock/005930", HYNIX: "/stock/000660", KOSPI: "/market", KOSDAQ: "/market" };

function QuoteCell({ q }: { q: Quote }) {
  const prev = useRef(q.price);
  const [flash, setFlash] = useState<{ dir: "up" | "down"; n: number } | null>(null);
  useEffect(() => {
    if (q.price !== prev.current) {
      setFlash((f) => ({ dir: q.price > prev.current ? "up" : "down", n: (f?.n ?? 0) + 1 }));
      prev.current = q.price;
      const t = setTimeout(() => setFlash(null), 700);
      return () => clearTimeout(t);
    }
  }, [q.price]);
  const dir = q.change > 0 ? 1 : q.change < 0 ? -1 : 0;
  const color = dir > 0 ? "text-up" : dir < 0 ? "text-down" : "text-ink-2";
  const tag = q.region === "global" ? "🌐" : REGIONS[q.region].flag;
  const diff = q.diff ?? q.price - q.base;
  const cls = cx("flex min-w-[176px] flex-col gap-1 rounded-xl px-3.5 py-3 transition-colors", LINKS[q.id] && "hover:bg-surface-2", flash?.dir === "up" && "animate-flash-up", flash?.dir === "down" && "animate-flash-down");
  const body = (
    <>
      <span className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-ink-3">
        <span aria-hidden className="text-[11px]">{tag}</span>
        {q.name}
        {q.live && <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold text-up"><span className="size-1.5 animate-pulse rounded-full bg-up" />실시간</span>}
      </span>
      <b className={cx("num text-[18px] font-bold tracking-tight", color)}>{q.prefix}{fmtNum(q.price, q.digits)}</b>
      <div className="flex items-center justify-between gap-2">
        <span className={cx("num text-[12.5px] font-semibold", color)}>
          {dir > 0 ? "▲" : dir < 0 ? "▼" : "–"} {fmtNum(Math.abs(diff), q.digits)} <span className="font-bold">{q.change > 0 ? "+" : ""}{q.change.toFixed(2)}%</span>
        </span>
        <Sparkline data={q.hist} up={dir >= 0} width={52} height={22} />
      </div>
    </>
  );
  return LINKS[q.id] ? (
    <Link key={flash?.n} href={LINKS[q.id]} className={cls}>{body}</Link>
  ) : (
    <div key={flash?.n} className={cls}>{body}</div>
  );
}

export function MarketStrip() {
  const { data, updatedAt } = usePoll<{ quotes: Quote[]; source?: string }>("/api/market", 1_000, { quotes: [] });
  return (
    <section className="card overflow-hidden lg:col-span-12" aria-label="글로벌 시세">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h3 className="text-[14.5px] font-bold">글로벌 시장 지표</h3>
        <span className="ml-auto hidden text-right sm:block num text-[12px] text-ink-3 sm:mr-4">{updatedAt ? `${fmtTime(new Date(updatedAt))} 업데이트 · ${data.source === "demo" ? "데모 시세" : "국내 1초 실시간(네이버) · 해외 15~20분 지연(Yahoo)"}` : "시세 불러오는 중…"}</span>
        <Link href="/market" className="ml-auto inline-flex h-8 shrink-0 items-center gap-0.5 rounded-lg pr-1.5 pl-3 text-[13px] font-semibold text-ink-2 transition hover:bg-surface-2 hover:text-ink sm:ml-0">
          국내 전체보기<Icon name="chevR" className="size-4" />
        </Link>
      </div>
      <div className="no-scrollbar flex snap-x overflow-x-auto p-1.5 [&>*]:snap-start">
        {!data.quotes.length && Array.from({ length: 7 }, (_, k) => <div key={k} className="skeleton m-1.5 h-[78px] min-w-[156px] rounded-xl" />)}
        {data.quotes.map((q) => (
          <QuoteCell key={q.id} q={q} />
        ))}
      </div>
    </section>
  );
}
