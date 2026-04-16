# Copilot Web Relay — AI チャット Web アプリケーション

GitHub Copilot SDK を使ったブラウザベースの AI チャットアプリケーションです。

## アーキテクチャ

```
┌──────────────┐    WebSocket     ┌──────────────────┐    JSON-RPC     ┌──────────────┐
│   Browser    │ ◄──────────────► │  Express Server  │ ◄────────────► │  Copilot CLI │
│  (React/TS)  │   (ストリーミング)  │  (Node.js + WS)  │   (SDK管理)     │   (エンジン)  │
└──────────────┘                  └──────────────────┘                └──────────────┘
```

## 技術スタック

| コンポーネント | 技術 |
|---|---|
| **バックエンド** | Node.js + Express + WebSocket + `@github/copilot-sdk` |
| **フロントエンド** | React + TypeScript + Vite |
| **Markdown** | react-markdown + remark-gfm + rehype-highlight |

## セットアップ

```bash
# 依存関係のインストール
npm run install:all

# 開発サーバー起動（バックエンド + フロントエンド同時起動）
npm run dev
```

## npm スクリプト

| コマンド | 説明 |
|---|---|
| `npm run dev` | バックエンドとフロントエンドを同時起動 |
| `npm run dev:server` | バックエンドのみ起動 (port 3001) |
| `npm run dev:client` | フロントエンドのみ起動 (port 5173) |
| `npm run install:all` | 全パッケージの依存関係をインストール |
| `npm run build` | フロントエンドのプロダクションビルド |

## 機能

- 🤖 Copilot SDK によるリアルタイム AI チャット
- 📡 WebSocket によるストリーミングレスポンス
- 📝 Markdown レンダリング（コードブロック、テーブル、リスト等）
- 🎨 GitHub ダークテーマの UI
- ⚡ Vite による高速開発環境
