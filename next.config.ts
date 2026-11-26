import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더(당근과외)에 다른 package-lock.json이 있어 루트를 이 폴더로 고정
  // (안 그러면 상위 폴더 전체를 감시해서 파일이 바뀔 때마다 화면이 계속 새로고침됨)
  outputFileTracingRoot: import.meta.dirname,
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
