import type { Metadata } from "next";
import { MeView } from "@/components/me-view";


export const metadata: Metadata = { title: "내 정보" };

export default function MePage() {
  return <MeView />;
}
