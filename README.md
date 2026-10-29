## 概要
- 家系図を生成するアプリケーション
- データ実体はGEDCOM
- GEDCOMをパースして一般的な家系図の表記方法でcanvasにレンダリング

## 開発環境
ローカル環境はすべてdocker-composeで構築し、Node.jsやwranglerのバージョンを固定、パッケージ管理コマンドもdockerコンテナから実行する

## 技術スタック
- backend: hono
- frontend: next.js
- db: sqlite(将来的にmysqlへの移行予定なので、スイッチ可能にする)
- ui: shadcn/ui 
- canvas: react-konva
- パッケージ管理: pnpm (workspaces によるモノレポ)

## デプロイ構成
- backend: cloudflare worker
- frontend: cloudflare (OpenNext)
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