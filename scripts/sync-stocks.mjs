// 코스피·코스닥 전 종목 목록을 받아 src/lib/live/universe-snapshot.json 으로 저장합니다.
// 배포 환경에서 네이버 응답이 늦을 때 쓰는 비상용 목록입니다. (npm run sync:stocks)
import { writeFileSync } from "node:fs";

const num = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const signOf = (c) => (c === "1" || c === "2" ? 1 : c === "4" || c === "5" ? -1 : 0);

async function page(market, p) {
  const url = `https://m.stock.naver.com/api/stocks/marketValue/${market}?page=${p}&pageSize=100`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
      if (r.ok) return r.json();
    } catch {}
  }
  throw new Error(`실패: ${url}`);
}

const rows = [];
for (const market of ["KOSPI", "KOSDAQ"]) {
  const first = await page(market, 1);
  const pages = Math.ceil(first.totalCount / 100);
  const all = [first];
  for (let p = 2; p <= pages; p++) all.push(await page(market, p));
  for (const d of all)
    for (const x of d.stocks) {
      const s = signOf(x.compareToPreviousPrice?.code);
      rows.push([x.itemCode, x.stockName, market === "KOSPI" ? 0 : 1, Math.max(0, ["stock", "etf", "etn"].indexOf(x.stockEndType)),
        num(x.closePrice), s * Math.abs(num(x.compareToPreviousClosePrice)), s * Math.abs(num(x.fluctuationsRatio)), num(x.accumulatedTradingValue), num(x.marketValue), num(x.accumulatedTradingVolume)]);
    }
}
// [code, name, market(0 코스피·1 코스닥), type(0 stock·1 etf·2 etn), price, diff, rate, value, cap, volume]
writeFileSync(new URL("../src/lib/live/universe-snapshot.json", import.meta.url), JSON.stringify({ at: Date.now(), rows }));
console.log(`${rows.length}종목 저장`);
