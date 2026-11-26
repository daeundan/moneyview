import type { NextRequest } from "next/server";
import { getIssue } from "@/lib/live/store";

/** GET /api/issue/:id — 키워드 상세 요약 리포트 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/issue/[id]">) {
  const { id } = await ctx.params;
  const issue = await getIssue(id);
  if (!issue) return Response.json({ issue: null }, { status: 404 });
  return Response.json({ issue }, { headers: { "Cache-Control": "no-store" } });
}
