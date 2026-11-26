import type { NextRequest } from "next/server";
import { getInfo, getRealtime, getUniverse, isCode } from "@/lib/live/stocks";

/** GET /api/stocks/:code — 종목 기본 정보 + 1초 실시간 시세 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/stocks/[code]">) {
  const { code } = await ctx.params;
  if (!isCode(code)) return Response.json({ error: "잘못된 종목코드" }, { status: 400 });
  const [info, rt, uni] = await Promise.all([getInfo(code), getRealtime([code]), getUniverse()]);
  const row = uni.byCode.get(code);
  if (info === null) return Response.json({ error: "종목을 찾을 수 없어요" }, { status: 404 });
  // 네이버 일시 장애 — 목록에 있는 종목이면 기본 정보만으로 먼저 보여 주고, 다음 주기에 상세를 다시 받음
  if (!info) {
    if (!row) return Response.json({ error: "잠시 후 다시 시도해 주세요" }, { status: 503, headers: { "Retry-After": "1" } });
    const basic = { code, name: row.name, market: row.market, type: row.type, infos: [] };
    return Response.json({ at: Date.now(), info: basic, quote: rt.get(code) ?? null, cap: row.cap, partial: true }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ at: Date.now(), info, quote: rt.get(code) ?? null, cap: row?.cap ?? null }, { headers: { "Cache-Control": "no-store" } });
}
