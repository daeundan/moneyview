import type { Metadata } from "next";
import { MarketView } from "@/components/market/market-view";


export const metadata: Metadata = { title: "국내 주식" };

export default function MarketPage() {
  return <MarketView />;
}
