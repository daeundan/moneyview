import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더(당근과외)에 다른 package-lock.json이 있어 루트를 이 폴더로 고정
  // (안 그러면 상위 폴더 전체를 감시해서 파일이 바뀔 때마다 화면이 계속 새로고침됨)
  outputFileTracingRoot: import.meta.dirname,
  // 화면(HTML)은 항상 최신 버전을 받도록 캐시 금지 (JS·CSS 파일은 이름에 해시가 붙어 따로 캐시됨)
  async headers() {
    return [{ source: "/((?!_next/|icons/).*)", headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }] }];
  },
  turbopack: {
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
