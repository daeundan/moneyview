import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";

/** 로그인 확인(브라우저)이 끝난 뒤 그려지는 화면이라 즉시 탐색 검증에서 제외 */
export const instant = false;

export const metadata: Metadata = { title: "대시보드" };

export default function DashboardPage() {
  return <DashboardView />;
}
