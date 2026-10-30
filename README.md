## 概要
- 家系図を生成するアプリケーション
- データ実体はGEDCOM
- GEDCOMをパースして一般的な家系図の表記方法でcanvasにレンダリング

## 開発環境
ローカル環境はすべてdocker-composeで構築し、Node.jsやwranglerのバージョンを固定、パッケージ管理コマンドもdockerコンテナから実行する

- Node.js 24.22.2 (LTS) / pnpm 12.16.1 / wrangler 4.154.0
- pnpm の minimumReleaseAge (既定1日) は除外を設けず遵守する

| 用途 | コマンド |
| --- | --- |
| 依存インストール | `docker compose run --rm dev pnpm install` |
| 任意の pnpm コマンド | `docker compose run --rm dev pnpm <command>` |
| 開発サーバー (http://localhost:3000) | `docker compose up web` |
| lint / 型チェック / 単体テスト | `docker compose run --rm dev sh -c 'pnpm lint && pnpm typecheck && pnpm test'` |
| E2E (Playwright) | `docker compose --profile e2e run --rm e2e` |
| E2E の基準画像を更新 | `docker compose --profile e2e run --rm e2e ./apps/web/node_modules/.bin/playwright test -c apps/web/playwright.config.ts --update-snapshots` |
| Cloudflare プレビュー (http://localhost:8787) | `docker compose --profile preview up preview` |

## 技術スタック
- backend: hono
- frontend: next.js
- db: sqlite(将来的にmysqlへの移行予定なので、スイッチ可能にする)
- ui: shadcn/ui 
- canvas: react-konva
- パッケージ管理: pnpm (workspaces によるモノレポ)

## デプロイ構成
- backend: cloudflare worker
- frontend: Cloudflare Pages (Next.js の静的エクスポート `output: "export"` による SSG)
- db: Cloudflare D1

## 機能分担
- backend: 認証サーバー
- frontend: クライアントサイドのUIとAPI通信
- db: データベースへのアクセス

## ドキュメント役割
### README.md
アプリケーションの概要や目的、ネットワークや技術構成などの大項目
### docs/design/general.md
AI駆動含めた実装の基本方針

### docs/design/v*.md
バージョンごとの機能追加点と詳細設計