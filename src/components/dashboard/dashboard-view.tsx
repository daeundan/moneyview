"use client";
import { useAuth } from "@/components/providers";
import { AiBriefing, MoodCard } from "./ai-briefing";
import { MarketStrip } from "./market-strip";
import { RegionRankings } from "./region-rankings";
import { ImpactBoard } from "./impact-board";
import { SectorHeatmap } from "./sector-heatmap";
import { EventWatch } from "./event-watch";

export function DashboardView() {
  const { user } = useAuth();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      <AiBriefing name={user?.name ?? "회원"} />
      <MoodCard />
      <MarketStrip />
      <div className="mt-6 lg:col-span-12"><RegionRankings /></div>
      <div className="mt-6 lg:col-span-12"><ImpactBoard /></div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:col-span-12 lg:grid-cols-12 lg:gap-5">
        <SectorHeatmap />
        <EventWatch />
      </div>
    </div>
  );
}
