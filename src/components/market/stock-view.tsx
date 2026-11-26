"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePoll, useNow } from "@/lib/hooks";
import { ago } from "@/lib/live-client";
import { cx, fmtTime } from "@/lib/format";
import { Icon } from "@/components/ui/icons";
import { capHangeul, FavButton, krwHangeul, StockLogo, toneOf, useFlash, won } from "./parts";
import { StockChart, type Point, type Range } from "./stock-chart";

type Info = { code: string; name: string; market: string; type: string; description?: string; industry?: string; infos: { key: string; label: string; value: string }[] };
type Quote = { price: number; diff: number; rate: number; volume: number; value: number; open: number; high: number; low: number; status: string; at: number };
type Detail = { at: number; info: Info; quote: Quote | null; cap: number | null; error?: string; partial?: boolean };

const RANGES: [Range, string][] = [["1d", "1일"], ["1w", "1주"], ["1m", "1달"], ["3m", "3달"], ["1y", "1년"], ["5y", "5년"]];
const num = (s?: string) => Number(String(s ?? "").replace(/[^0-9.-]/g, "")) || 0;

/** 오늘의 범위 · 52주 범위 막대 */
function RangeBar({ title, low, high, cur }: { title: string; low: number; high: number; cur: number }) {
  const p = high > low ? Math.min(100, Math.max(0, ((cur - low) / (high - low)) * 100)) : 50;
  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold text-ink-2">{title}</div>
      <div className="relative h-1.5 rounded-full bg-surface-2">
        <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-down/50 to-up/60" style={{ width: `${p}%` }} />
        <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-surface transition-[left] duration-500" style={{ left: `${p}%` }} />
      </div>
      <div className="num mt-1.5 flex justify-between text-[12px] text-ink-3">
        <span>최저 <b className="font-semibold text-down">{won(low)}</b></span>
        <span>최고 <b className="font-semibold text-up">{won(high)}</b></span>
      </div>
    </div>
  );
}

function News({ code }: { code: string }) {
  const now = useNow(60_000);
  const { data, updatedAt } = usePoll<{ news: { title: string; link: string; press: string; time: number }[] }>(`/api/stocks/${code}/news`, 600_000, { news: [] });
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-[17px] font-bold tracking-tight">관련 뉴스</h2>
      {updatedAt == null ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((k) => <div key={k} className="skeleton h-12 rounded-xl" />)}</div>
      ) : !data.news.length ? (
        <p className="mt-3 text-[14px] text-ink-3">최근 24시간 관련 기사가 없어요.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {data.news.map((n) => (
            <li key={n.link}>
              <a href={n.link} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[14.5px] leading-snug font-medium group-hover:underline group-hover:underline-offset-4">{n.title}</span>
                  <span className="mt-1 block text-[12px] text-ink-3">{n.press}{now && n.time ? ` · ${ago(n.time, now.getTime())}` : ""}</span>
                </span>
                <Icon name="arrowUR" className="mt-1 size-4 shrink-0 text-ink-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function StockView({ code }: { code: string }) {
  const [range, setRange] = useState<Range>("1d");
  const [more, setMore] = useState(false);
  const { data: latest } = usePoll<Detail | null>(`/api/stocks/${code}`, 1000, null);
  // 한 번이라도 정상으로 받은 값은 유지 — 일시 오류로 화면이 깜빡이지 않게
  const [good, setGood] = useState<Detail | null>(null);
  if (latest?.info?.code === code && latest.at !== good?.at) {
    const prev = good?.info.code === code ? good : null;
    setGood({
      ...latest,
      // 기본 정보만 온 응답이면 이미 받은 상세 정보(PER·기업 개요 등)는 그대로 둠
      info: latest.partial && prev ? prev.info : latest.info,
      quote: latest.quote ?? prev?.quote ?? null,
    });
  }
  const data = good?.info.code === code ? good : null;
  const notFound = !data && latest?.error != null;
  const chart = usePoll<{ points: Point[] } | null>(`/api/stocks/${code}/chart?range=${range}`, range === "1d" ? 10_000 : range === "1w" ? 60_000 : 600_000, null);

  const info = data?.info;
  const q = data?.quote;
  const infoMap = useMemo(() => Object.fromEntries((info?.infos ?? []).map((x) => [x.key, x])), [info]);
  const prevClose = num(infoMap.lastClosePrice?.value) || (q ? q.price - q.diff : 0);
  const flash = useFlash(q?.price ?? 0);

  // 1일 차트: 마지막 점을 1초 실시간 가격으로 갱신
  const points = useMemo(() => {
    const p = chart.data?.points ?? [];
    if (range !== "1d" || !q || !p.length) return p;
    const last = p[p.length - 1];
    if (q.at - last.t < 60_000) return [...p.slice(0, -1), { ...last, v: q.price }];
    return [...p, { t: q.at, v: q.price, vol: 0 }];
  }, [chart.data, q, range]);

  if (notFound) {
    return (
      <div className="mx-auto mt-16 max-w-[420px] text-center">
        <h1 className="text-[22px] font-bold">종목을 찾을 수 없어요</h1>
        <Link href="/market" className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-[14px] font-semibold text-bg">국내 주식 목록</Link>
      </div>
    );
  }

  const open = q?.status === "OPEN";
  const rangeChange = (() => {
    if (range === "1d" || points.length < 2 || !q) return null;
    const d = q.price - points[0].v;
    return { d, r: (d / points[0].v) * 100 };
  })();

  const rows: [string, string][] = info
    ? [
        ["시가", q?.open ? won(q.open) : infoMap.openPrice?.value ?? "-"],
        ["고가", q?.high ? won(q.high) : infoMap.highPrice?.value ?? "-"],
        ["저가", q?.low ? won(q.low) : infoMap.lowPrice?.value ?? "-"],
        ["전일 종가", won(prevClose)],
        // 실시간 피드는 KRX 거래량만, 종목 정보는 대체거래소(NXT) 포함 → 더 큰 값을 표시
        ["거래량", `${won(Math.max(q?.volume ?? 0, num(infoMap.accumulatedTradingVolume?.value)))}주`],
        ["거래대금", q?.value ? krwHangeul(q.value) : infoMap.accumulatedTradingValue?.value ?? "-"],
        ["시가총액", data?.cap ? capHangeul(data.cap) : infoMap.marketValue?.value ?? "-"],
        ["외국인 소진율", infoMap.foreignRate?.value ?? "-"],
        ["PER", infoMap.per?.value ?? "-"],
        ["PBR", infoMap.pbr?.value ?? "-"],
        ["EPS", infoMap.eps?.value ?? "-"],
        ["배당수익률", infoMap.dividendYieldRatio?.value ?? "-"],
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1120px]">
      <Link href="/market" className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13.5px] font-medium text-ink-3 transition hover:bg-surface-2 hover:text-ink">
        <Icon name="chevL" className="size-4" />국내 주식
      </Link>

      {/* 헤더 */}
      <header className="mt-3 flex items-start gap-3 animate-rise">
        {info ? <StockLogo code={code} name={info.name} size={48} /> : <span className="skeleton size-12 rounded-full" />}
        <div className="min-w-0 flex-1">
          {info && <title>{`${info.name} 실시간 시세 · 머니뷰`}</title>}
          <div className="flex items-center gap-2 text-[13.5px] text-ink-3">
            <b className="text-[17px] font-bold text-ink">{info?.name ?? "　"}</b>
            <span className="num">{code}</span>
            {info && <span>· {info.market === "KOSPI" ? "코스피" : info.market === "KOSDAQ" ? "코스닥" : info.market}</span>}
            {info?.industry && <span className="hidden sm:inline">· {info.industry}</span>}
          </div>
          {q ? (
            <>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <b key={flash?.n} className={cx("num -mx-1 rounded-lg px-1 text-[34px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[40px]", toneOf(q.diff), flash?.dir === "up" && "animate-flash-up", flash?.dir === "down" && "animate-flash-down")}>
                  {won(q.price)}<span className="text-[24px] sm:text-[28px]">원</span>
                </b>
              </div>
              <p className={cx("num text-[15px] font-semibold", toneOf(q.diff))}>
                <span className="font-medium text-ink-3">어제보다 </span>
                {q.diff > 0 ? "+" : q.diff < 0 ? "-" : ""}{won(Math.abs(q.diff))}원 ({q.rate > 0 ? "+" : ""}{q.rate.toFixed(2)}%)
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                <span className={cx("size-1.5 rounded-full", open ? "animate-pulse bg-up" : "bg-ink-3")} />
                {open ? "실시간" : "장 마감"} · {data?.at ? fmtTime(new Date(data.at)) : ""} 기준
              </p>
            </>
          ) : (
            <div className="mt-2 space-y-2"><div className="skeleton h-10 w-56 rounded-xl" /><div className="skeleton h-5 w-40 rounded-full" /></div>
          )}
        </div>
        {info && <FavButton code={code} name={info.name} className="size-11 border border-line" />}
      </header>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          {/* 차트 */}
          <section className="card p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[13px] text-ink-3">
                {range === "1d" ? "오늘 09:00 ~ 15:30" : rangeChange ? (
                  <>
                    {RANGES.find((r) => r[0] === range)![1]} 수익률{" "}
                    <b className={cx("num font-bold", toneOf(rangeChange.d))}>{rangeChange.r > 0 ? "+" : ""}{rangeChange.r.toFixed(2)}%</b>
                  </>
                ) : ""}
              </span>
            </div>
            <StockChart points={points} base={prevClose} range={range} live={range === "1d" && open} />
            <div role="tablist" className="mt-4 grid grid-cols-6 gap-1 rounded-xl bg-surface-2 p-1">
              {RANGES.map(([k, label]) => (
                <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)}
                  className={cx("h-9 rounded-lg text-[13.5px] font-semibold transition", range === k ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink")}>
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 시세 정보 */}
          <section className="card p-5 sm:p-6">
            <h2 className="text-[17px] font-bold tracking-tight">시세 정보</h2>
            {q && (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <RangeBar title="오늘의 범위" low={q.low || q.price} high={q.high || q.price} cur={q.price} />
                <RangeBar title="52주 범위" low={num(infoMap.lowPriceOf52Weeks?.value)} high={num(infoMap.highPriceOf52Weeks?.value)} cur={q.price} />
              </div>
            )}
            <dl className="mt-6 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line py-3 text-[14px]">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="num font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {info?.description && (
            <section className="card p-5 sm:p-6">
              <h2 className="text-[17px] font-bold tracking-tight">기업 개요</h2>
              <p className={cx("mt-3 text-[14.5px] leading-[1.75] text-ink-2", !more && "line-clamp-4")}>{info.description}</p>
              <button onClick={() => setMore((v) => !v)} className="mt-2 text-[13.5px] font-semibold text-ink-3 hover:text-ink">{more ? "접기" : "더 보기"}</button>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:col-span-4">
          <News code={code} />
          <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-4 text-[12.5px] leading-relaxed text-ink-3">
            <Icon name="info" className="mt-0.5 size-4 shrink-0" />
            시세는 네이버 금융 공개 데이터(학습·테스트용)를 1초마다 받아와요. 실제 주문 화면의 가격과 약간 차이가 날 수 있으며 투자 권유가 아닙니다.
          </p>
        </aside>
      </div>
    </div>
  );
}
