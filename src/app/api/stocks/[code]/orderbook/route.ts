import type { NextRequest } from "next/server";
import { getOrderBook, isCode } from "@/lib/live/stocks";

/** GET /api/stocks/:code/orderbook — 매도·매수 호가 5단계 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/stocks/[code]/orderbook">) {
  const { code } = await ctx.params;
  if (!isCode(code)) return Response.json({ error: "잘못된 종목코드" }, { status: 400 });
  const ob = await getOrderBook(code);
  if (!ob) return Response.json({ error: "호가를 불러오지 못했어요" }, { status: 503 });
  return Response.json(ob, { headers: { "Cache-Control": "no-store" } });
}
