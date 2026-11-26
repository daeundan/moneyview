import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "머니뷰 MoneyView — AI 글로벌 마켓 리포트", template: "%s · 머니뷰" },
  description: "전 세계 뉴스를 AI가 읽고 요약해, 증권시장에 미칠 영향을 실시간으로 알려드려요.",
  // 아이폰 '홈 화면에 추가' → 사파리 주소창·탭 없이 앱처럼 열림
  appleWebApp: { capable: true, title: "머니뷰", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0c0e",
};

// 기본은 다크 모드 — 사용자가 직접 라이트로 바꾼 경우에만 라이트
const themeScript = `try{if(localStorage.getItem('mv_theme')==='light')document.documentElement.classList.remove('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="min-h-svh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
