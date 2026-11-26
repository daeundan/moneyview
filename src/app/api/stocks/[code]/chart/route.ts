import type { NextRequest } from "next/server";
import { getChart, isCode, RANGES, type Range } from "@/lib/live/stocks";

/** GET /api/stocks/:code/chart?range=1d|1w|1m|3m|1y|5y — 분봉/일봉 차트 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/stocks/[code]/chart">) {
  const { code } = await ctx.params;
  const range = (req.nextUrl.searchParams.get("range") ?? "1d") as Range;
  if (!isCode(code) || !RANGES.includes(range)) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  const points = await getChart(code, range);
  return Response.json({ at: Date.now(), range, points }, { headers: { "Cache-Control": "no-store" } });
}
