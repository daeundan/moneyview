import type { NextRequest } from "next/server";
import { getInfo, getRealtime, getUniverse, isCode } from "@/lib/live/stocks";

/** GET /api/stocks/:code — 종목 기본 정보 + 1초 실시간 시세 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/stocks/[code]">) {
  const { code } = await ctx.params;
  if (!isCode(code)) return Response.json({ error: "잘못된 종목코드" }, { status: 400 });
  const [info, rt, uni] = await Promise.all([getInfo(code), getRealtime([code]), getUniverse()]);
  if (!info) return Response.json({ error: "종목을 찾을 수 없어요" }, { status: 404 });
  const row = uni.byCode.get(code);
  return Response.json({ at: Date.now(), info, quote: rt.get(code) ?? null, cap: row?.cap ?? null }, { headers: { "Cache-Control": "no-store" } });
}
