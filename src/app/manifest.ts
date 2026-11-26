import type { MetadataRoute } from "next";

/** 홈 화면에 추가했을 때 주소창·탭 없이 앱처럼 열리게 하는 설정 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "머니뷰 MoneyView",
    short_name: "머니뷰",
    description: "전 세계 뉴스를 AI가 읽고 요약해, 증권시장에 미칠 영향을 실시간으로 알려드려요.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0c0e",
    theme_color: "#0b0c0e",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
