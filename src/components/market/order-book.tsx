"use client";
import { usePoll } from "@/lib/hooks";
import { cx } from "@/lib/format";
import { won } from "./parts";

type Level = { price: number; qty: number };
type Book = { at: number; prevClose: number; asks: Level[]; bids: Level[]; totalAsk: number; totalBid: number };

/** 호가창 — 매도(파랑)·매수(빨강) 5단계, 2초마다 갱신 */
export function OrderBook({ code, price }: { code: string; price?: number }) {
  const { data } = usePoll<Book | null>(`/api/stocks/${code}/orderbook`, 2000, null);
  const book = data && "asks" in data ? data : null;
  const max = book ? Math.max(1, ...book.asks.map((x) => x.qty), ...book.bids.map((x) => x.qty)) : 1;
  const pct = (p: number) => (book?.prevClose ? ((p - book.prevClose) / book.prevClose) * 100 : 0);

  const row = (x: Level, side: "ask" | "bid") => {
    const r = pct(x.price);
    const isCur = price != null && x.price === price;
    return (
      <li key={`${side}-${x.price}`} className={cx("grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 text-[13.5px]", isCur && "rounded-lg ring-1 ring-ink/60")}>
        {/* 매도 잔량은 왼쪽, 매수 잔량은 오른쪽 */}
        <span className="relative h-6">
          {side === "ask" && (
            <>
              <span className="absolute inset-y-0 right-0 rounded-l bg-down/15" style={{ width: `${(x.qty / max) * 100}%` }} />
              <span className="num relative flex h-full items-center justify-end pr-2 text-ink-2">{won(x.qty)}</span>
            </>
          )}
        </span>
        <span className="num w-[92px] text-center">
          <b className={cx("block font-semibold", r > 0 ? "text-up" : r < 0 ? "text-down" : "text-ink")}>{won(x.price)}</b>
          <span className={cx("block text-[11px]", r > 0 ? "text-up/80" : r < 0 ? "text-down/80" : "text-ink-3")}>{r > 0 ? "+" : ""}{r.toFixed(2)}%</span>
        </span>
        <span className="relative h-6">
          {side === "bid" && (
            <>
              <span className="absolute inset-y-0 left-0 rounded-r bg-up/15" style={{ width: `${(x.qty / max) * 100}%` }} />
              <span className="num relative flex h-full items-center pl-2 text-ink-2">{won(x.qty)}</span>
            </>
          )}
        </span>
      </li>
    );
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-bold tracking-tight">호가</h2>
        <span className="text-[12px] text-ink-3">정규장(KRX) 5단계</span>
      </div>
      {!book ? (
        <div className="mt-4 space-y-1.5">{Array.from({ length: 10 }, (_, k) => <div key={k} className="skeleton h-8 rounded-lg" />)}</div>
      ) : (
        <>
          <ul className="mt-3">{book.asks.map((x) => row(x, "ask"))}</ul>
          <div className="my-1 border-t border-line" />
          <ul>{book.bids.map((x) => row(x, "bid"))}</ul>
          <div className="num mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
            <div className="rounded-xl bg-down/10 px-3 py-2 text-down">매도 잔량 <b className="float-right font-semibold">{won(book.totalAsk)}</b></div>
            <div className="rounded-xl bg-up/10 px-3 py-2 text-up">매수 잔량 <b className="float-right font-semibold">{won(book.totalBid)}</b></div>
          </div>
        </>
      )}
    </section>
  );
}
