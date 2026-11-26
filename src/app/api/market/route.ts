import { connection } from "next/server";
import { getQuotes } from "@/lib/live/store";

/** GET /api/market — 글로벌 지수·환율·원자재 시세 (Yahoo Finance, 무료 · 지연 시세) */
export async function GET() {
  await connection();
  const q = await getQuotes();
  return Response.json({ updatedAt: q.at, source: q.source, quotes: q.data }, { headers: { "Cache-Control": "no-store" } });
}
