import type { NextRequest } from "next/server";
import { getInfo, getStockNews, isCode } from "@/lib/live/stocks";

/** GET /api/stocks/:code/news — 종목 관련 최신 기사 (제목·언론사·링크만) */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/stocks/[code]/news">) {
  const { code } = await ctx.params;
  if (!isCode(code)) return Response.json({ news: [] }, { status: 400 });
  const info = await getInfo(code);
  return Response.json({ news: info ? await getStockNews(info.name) : [] }, { headers: { "Cache-Control": "no-store" } });
}
