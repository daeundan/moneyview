import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 무료 모드: 별도 캐시 저장소(R2/KV) 없이 배포
export default defineCloudflareConfig({});
