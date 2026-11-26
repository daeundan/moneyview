import { connection, type NextRequest } from "next/server";
import { getUniverse, isCode, withRealtime, type StockRow } from "@/lib/live/stocks";

const SORTS: Record<string, (a: StockRow, b: StockRow) => number> = {
  cap: (a, b) => b.cap - a.cap,
  value: (a, b) => b.value - a.value,
  volume: (a, b) => b.volume - a.volume,
  up: (a, b) => b.rate - a.rate,
  down: (a, b) => a.rate - b.rate,
};

/**
 * GET /api/stocks — 국내 전 종목 (검색·정렬·페이지) + 보이는 종목은 1초 실시간 가격
 * ?market=all|KOSPI|KOSDAQ &type=stock|etf|all &sort=cap|value|volume|up|down &q=검색어 &page=1 &size=30
 * ?codes=005930,000660 → 관심종목만
 */
export async function GET(req: NextRequest) {
  await connection();
  const sp = req.nextUrl.searchParams;
  const uni = await getUniverse();
  const size = Math.min(300, Math.max(10, Number(sp.get("size")) || 30));
  const page = Math.max(1, Number(sp.get("page")) || 1);

  let rows: StockRow[];
  const codes = sp.get("codes");
  if (codes != null) {
    rows = codes.split(",").filter(isCode).slice(0, 100).map((c) => uni.byCode.get(c)).filter((x): x is StockRow => !!x);
  } else {
    const market = sp.get("market");
    const type = sp.get("type") ?? "stock";
    const q = (sp.get("q") ?? "").trim().toLowerCase();
    rows = uni.rows.filter(
      (r) =>
        (market !== "KOSPI" && market !== "KOSDAQ" ? true : r.market === market) &&
        (type === "all" ? true : type === "etf" ? r.type !== "stock" : r.type === "stock") &&
        (!q || r.name.toLowerCase().includes(q) || r.code.includes(q)),
    );
    // 등락률 정렬 시 거래가 거의 없는 종목 제외
    const sort = SORTS[sp.get("sort") ?? "cap"] ?? SORTS.cap;
    if (sp.get("sort") === "up" || sp.get("sort") === "down") rows = rows.filter((r) => r.value >= 100);
    rows = [...rows].sort(sort);
  }
  const total = rows.length;
  const pageRows = await withRealtime(rows.slice((page - 1) * size, page * size));
  return Response.json({ at: Date.now(), listAt: uni.at, total, page, size, rows: pageRows }, { headers: { "Cache-Control": "no-store" } });
}
