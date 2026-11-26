"use client";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { usePoll } from "@/lib/hooks";
import { useFavorites } from "@/lib/favorites";
import { cx, fmtTime } from "@/lib/format";
import { Icon } from "@/components/ui/icons";
import { LiveDot } from "@/components/ui/kit";
import { capHangeul, FavButton, krwHangeul, signed, StockLogo, toneOf, useFlash, won } from "./parts";

export interface Row {
  code: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  type: string;
  price: number;
  diff: number;
  rate: number;
  value: number;
  cap: number;
  volume: number;
}
type Resp = { at: number; total: number; rows: Row[] };

const TABS = [
  ["fav", "관심"],
  ["all", "전체"],
  ["KOSPI", "코스피"],
  ["KOSDAQ", "코스닥"],
] as const;
const SORTS = [
  ["cap", "시가총액"],
  ["value", "거래대금"],
  ["volume", "거래량"],
  ["up", "급상승"],
  ["down", "급하락"],
] as const;
const PAGE = 30;

function StockRowItem({ r, rank }: { r: Row; rank: number }) {
  const flash = useFlash(r.price);
  return (
    <li>
      <Link
        href={`/stock/${r.code}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl px-2 py-2.5 transition hover:bg-surface-2 sm:grid-cols-[28px_auto_minmax(0,1fr)_120px_96px_96px_auto] sm:px-3"
      >
        <span className="num hidden text-center text-[14px] font-bold text-ink-3 sm:block">{rank}</span>
        <StockLogo code={r.code} name={r.name} size={38} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{r.name}</span>
          <span className="num block text-[12px] text-ink-3">
            {r.code} · {r.market === "KOSPI" ? "코스피" : "코스닥"}
            <span className="sm:hidden"> · {krwHangeul(r.value)}</span>
          </span>
        </span>
        <span className="text-right sm:contents">
          <span key={flash?.n} className={cx("num block rounded-md px-1 text-right text-[15.5px] font-bold", flash?.dir === "up" && "animate-flash-up", flash?.dir === "down" && "animate-flash-down")}>{won(r.price)}원</span>
          <span className={cx("num block text-right text-[13px] font-semibold", toneOf(r.rate))}>
            <span className="hidden sm:inline">{r.diff > 0 ? "▲" : r.diff < 0 ? "▼" : ""}{won(Math.abs(r.diff))} </span>
            <span className="sm:hidden">{signed(r.rate)}</span>
            <span className="hidden sm:block">{signed(r.rate)}</span>
          </span>
        </span>
        <span className="num hidden text-right text-[13px] text-ink-2 sm:block">{krwHangeul(r.value)}<span className="block text-[11.5px] text-ink-3">시총 {capHangeul(r.cap)}</span></span>
        <span className="hidden sm:block"><FavButton code={r.code} name={r.name} /></span>
      </Link>
    </li>
  );
}

export function MarketView() {
  const fav = useFavorites();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("cap");
  const [etf, setEtf] = useState(false);
  const [qInput, setQ] = useState("");
  const q = useDeferredValue(qInput.trim());
  const [pages, setPages] = useState(1);

  const params = new URLSearchParams({ size: String(PAGE * pages), sort, type: etf ? "etf" : "stock" });
  if (tab === "fav") params.set("codes", fav.list.join(","));
  else params.set("market", tab);
  if (q && tab !== "fav") params.set("q", q);
  const url = `/api/stocks?${params}`;

  const { data, updatedAt } = usePoll<Resp | null>(url, 1000, null);
  // 탭을 바꾸는 동안 이전 목록을 잠시 유지해서 깜빡임 방지
  const [last, setLast] = useState<Resp | null>(null);
  if (data && data !== last) setLast(data);
  const shown = data ?? last;
  const stale = !data;

  const reset = () => setPages(1);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-rise">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.04em] sm:text-[32px]">국내 주식</h1>
          <p className="mt-1 flex items-center gap-2 text-[13.5px] text-ink-3">
            <LiveDot /> 코스피·코스닥 {shown ? shown.total.toLocaleString() : "—"}종목 · 1초마다 실시간 갱신
            {updatedAt && <span className="num">· {fmtTime(new Date(updatedAt))}</span>}
          </p>
        </div>
        <label className="relative w-full sm:w-[300px]">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-ink-3" />
          <input
            value={qInput}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
              if (tab === "fav") setTab("all");
            }}
            placeholder="종목명 또는 코드 검색"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-[14.5px] outline-none transition placeholder:text-ink-3 focus:border-ink-3"
          />
        </label>
      </header>

      <div className="card p-2 sm:p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-1 pb-3 sm:px-2">
          <div role="tablist" className="flex gap-1">
            {TABS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k}
                onClick={() => { setTab(k); reset(); }}
                className={cx("inline-flex h-9 items-center gap-1 rounded-xl px-3.5 text-[14px] font-bold transition", tab === k ? "bg-ink text-bg" : "text-ink-3 hover:bg-surface-2 hover:text-ink")}>
                {k === "fav" && <Icon name="star" className="size-3.5" fill="currentColor" />}
                {label}
                {k === "fav" && <span className="num text-[12px] opacity-70">{fav.list.length}</span>}
              </button>
            ))}
          </div>
          <div className="no-scrollbar -mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1">
            {SORTS.map(([k, label]) => (
              <button key={k} onClick={() => { setSort(k); reset(); }}
                className={cx("h-8 shrink-0 rounded-lg px-3 text-[13px] font-semibold transition", sort === k ? "bg-surface-2 text-ink" : "text-ink-3 hover:text-ink")}>
                {label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-line" />
            <button onClick={() => { setEtf((v) => !v); reset(); }} aria-pressed={etf}
              className={cx("h-8 shrink-0 rounded-lg border px-3 text-[13px] font-semibold transition", etf ? "border-ink bg-ink text-bg" : "border-line text-ink-3 hover:text-ink")}>
              ETF·ETN
            </button>
          </div>
        </div>

        <div className="hidden grid-cols-[28px_auto_minmax(0,1fr)_120px_96px_96px_auto] gap-3 px-3 pt-3 pb-1 text-[12px] font-medium text-ink-3 sm:grid">
          <span className="text-center">#</span>
          <span className="w-[38px]" />
          <span>종목</span>
          <span className="text-right">현재가</span>
          <span className="text-right">등락</span>
          <span className="text-right">거래대금</span>
          <span className="w-9" />
        </div>

        {tab === "fav" && !fav.list.length ? (
          <div className="py-16 text-center">
            <Icon name="star" className="mx-auto size-8 text-ink-3/40" />
            <p className="mt-3 text-[15px] font-semibold">아직 관심종목이 없어요</p>
            <p className="mt-1 text-[13.5px] text-ink-3">종목 옆 ☆를 누르면 여기에 모아볼 수 있어요.</p>
            <button onClick={() => setTab("all")} className="mt-5 h-10 rounded-xl bg-ink px-4 text-[14px] font-semibold text-bg">전체 종목 보기</button>
          </div>
        ) : !shown ? (
          <ul className="space-y-1 pt-2">
            {Array.from({ length: 10 }, (_, k) => <li key={k} className="skeleton h-[60px] rounded-2xl" />)}
          </ul>
        ) : shown.rows.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-ink-3">‘{q}’에 맞는 종목이 없어요.</p>
        ) : (
          <ul className={cx("pt-1 transition-opacity", stale && "opacity-60")}>
            {shown.rows.map((r, i) => <StockRowItem key={r.code} r={r} rank={i + 1} />)}
          </ul>
        )}

        {shown && tab !== "fav" && shown.rows.length < shown.total && (
          <div className="flex justify-center pt-3 pb-2">
            <button onClick={() => setPages((p) => p + 1)} className="h-11 rounded-xl border border-line bg-surface px-5 text-[14px] font-semibold transition hover:border-ink-3">
              더 보기 <span className="num text-ink-3">({shown.rows.length.toLocaleString()} / {shown.total.toLocaleString()})</span>
            </button>
          </div>
        )}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
        시세 출처: 네이버 금융(학습·테스트용 공개 데이터). 정렬은 1분마다 새로 계산되고, 화면에 보이는 종목의 가격은 1초마다 갱신돼요. 투자 권유가 아닙니다.
      </p>
    </div>
  );
}
