/**
 * Vite 設定
 *
 * 開発サーバーの /ws リクエストをバックエンド（port 3001）にプロキシする。
 * target は http:// で指定（Vite 内部の http-proxy が WS Upgrade を自動処理）。
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // WebSocket プロキシ: ブラウザ → Vite dev server → Express バックエンド
      "/ws": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
});
