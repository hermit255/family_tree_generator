import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages で配信する静的ファイルを out/ に出力する(SSG)
  output: "export",
  // workspace パッケージは TypeScript ソースのまま参照するためトランスパイル対象にする
  transpilePackages: ["@kakeizu/gedcom"],
  // docker compose の e2e サービスはホスト名 web で開発サーバーへ接続する
  allowedDevOrigins: ["web"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
