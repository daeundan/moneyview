import { connection } from "next/server";
import { getSnapshot } from "@/lib/live/store";

/** GET /api/trends — 대륙별 이슈 키워드 순위 + 이슈 요약 (뉴스 RSS 기반, 5분 캐시) */
export async function GET() {
  await connection();
  const s = await getSnapshot();
  return Response.json(s, { headers: { "Cache-Control": "no-store" } });
}
