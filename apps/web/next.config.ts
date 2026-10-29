import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // workspace パッケージは TypeScript ソースのまま参照するためトランスパイル対象にする
  transpilePackages: ["@kakeizu/gedcom"],
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
