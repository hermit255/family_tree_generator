import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
