/* =========================================================
   글로벌 시세 (데모용 모의 데이터 — 실시세 수집 실패 시 대체용)
   시간(t)에 따라 연속적으로 변하는 값이라 새로고침/폴링 시
   자연스럽게 움직입니다. 실제 서비스에서는 시세 API로 교체하세요.
   ========================================================= */
import type { Region } from "./issues";

export interface Instrument {
  id: string;
  name: string;
  region: Region | "global";
  base: number;
  digits: number;
  prefix?: string;
}

export interface Quote extends Instrument {
  price: number;
  change: number; // %
  hist: number[];
  /** 전일 대비 금액 */
  diff?: number;
  /** true = 실시간(초 단위), false = 지연 시세 */
  live?: boolean;
}

export const INSTRUMENTS: Instrument[] = [
  { id: "SPX", name: "S&P 500", region: "us", base: 5912.17, digits: 2 },
  { id: "IXIC", name: "나스닥", region: "us", base: 19268.4, digits: 2 },
  { id: "DJI", name: "다우존스", region: "us", base: 43870.35, digits: 2 },
  { id: "SX5E", name: "유로스톡스50", region: "eu", base: 4850.2, digits: 2 },
  { id: "DAX", name: "독일 DAX", region: "eu", base: 19210.8, digits: 2 },
  { id: "UKX", name: "영국 FTSE100", region: "eu", base: 8120.5, digits: 2 },
  { id: "KOSPI", name: "코스피", region: "asia", base: 2651.32, digits: 2 },
  { id: "N225", name: "닛케이225", region: "asia", base: 38640.1, digits: 2 },
  { id: "HSI", name: "항셍", region: "asia", base: 19580.4, digits: 2 },
  { id: "SHCOMP", name: "상하이종합", region: "asia", base: 3320.7, digits: 2 },
  { id: "JSE", name: "남아공 JSE", region: "africa", base: 86420.5, digits: 2 },
  { id: "EGX30", name: "이집트 EGX30", region: "africa", base: 30215.4, digits: 2 },
  { id: "USDKRW", name: "원/달러", region: "global", base: 1401.2, digits: 2 },
  { id: "GOLD", name: "금", region: "global", base: 4120.5, digits: 1, prefix: "$" },
  { id: "WTI", name: "WTI 유가", region: "global", base: 68.42, digits: 2, prefix: "$" },
  { id: "BTC", name: "비트코인", region: "global", base: 96820, digits: 0, prefix: "$" },
];

const seedOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);

/** t: 초 단위 시각 */
function priceAt(ins: Instrument, t: number) {
  const s = seedOf(ins.id);
  const vol = ins.id === "BTC" ? 2.4 : ins.region === "global" ? 1.4 : 1;
  const n =
    0.0042 * Math.sin(t / 900 + s) +
    0.0021 * Math.sin(t / 140 + s * 2.1) +
    0.0009 * Math.sin(t / 11 + s * 5.3) +
    0.0004 * Math.sin(t / 2.7 + s * 1.7);
  return ins.base * (1 + n * vol);
}

export function quotesAt(tMs: number): Quote[] {
  const t = tMs / 1000;
  return INSTRUMENTS.map((ins) => {
    const s = seedOf(ins.id);
    const prevClose = ins.base * (1 + (((s % 17) - 8) / 8) * 0.009);
    const hist = Array.from({ length: 40 }, (_, k) => priceAt(ins, t - (39 - k) * 45));
    const price = hist[hist.length - 1];
    return { ...ins, price, change: (price / prevClose - 1) * 100, hist };
  });
}

/** 서버 첫 렌더용 고정값 (시간 의존 X) */
export const INITIAL_QUOTES: Quote[] = quotesAt(1_763_424_000_000);
