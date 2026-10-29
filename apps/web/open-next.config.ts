import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// v1 はクライアント完結のため incremental cache 等のオーバーライドは使わない
export default defineCloudflareConfig({});
