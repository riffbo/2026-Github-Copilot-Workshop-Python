/**
 * Copilot Web Relay — バックエンドサーバー
 *
 * Express HTTP サーバーと WebSocket サーバーを起動し、
 * Copilot SDK を介して AI チャット機能を提供する。
 *
 * アーキテクチャ:
 *   ブラウザ ←WebSocket→ このサーバー ←JSON-RPC→ Copilot CLI (SDK 管理)
 *
 * WebSocket プロトコル:
 *   クライアント → サーバー: { type: "chat", content: "..." }
 *   サーバー → クライアント: { type: "ready" | "delta" | "done" | "error", content?: "..." }
 */

import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { CopilotClient, approveAll } from "@github/copilot-sdk";

const PORT = Number(process.env.PORT) || 3001;

// Express アプリケーションと HTTP サーバーの初期化
const app = express();
const server = createServer(app);

// WebSocket サーバーを /ws パスでアタッチ
const wss = new WebSocketServer({ server, path: "/ws" });

// Copilot SDK クライアント（サーバー起動時に初期化）
let client: CopilotClient;

/**
 * Copilot SDK クライアントを起動する。
 * 内部で Copilot CLI プロセスを管理し、JSON-RPC 接続を確立する。
 */
async function startCopilotClient() {
  client = new CopilotClient();
  await client.start();
  console.log("Copilot client started");
}

// --- WebSocket 接続ハンドラ ---
wss.on("connection", async (ws: WebSocket) => {
  console.log("WebSocket client connected");
  let session: Awaited<ReturnType<CopilotClient["createSession"]>> | null =
    null;

  try {
    // 接続ごとに新しい Copilot セッションを作成
    // streaming: true で assistant.message_delta イベントを有効化
    session = await client.createSession({
      model: "gpt-4.1",
      streaming: true,
      onPermissionRequest: approveAll,
    });

    // ストリーミングチャンク: AI の応答を逐次的にクライアントへ送信
    session.on("assistant.message_delta", (event) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "delta",
            content: event.data.deltaContent,
          })
        );
      }
    });

    // セッションアイドル: AI の応答が完了したことをクライアントに通知
    session.on("session.idle", () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "done" }));
      }
    });

    // セッション作成成功をクライアントに通知
    ws.send(JSON.stringify({ type: "ready" }));
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    ws.send(
      JSON.stringify({
        type: "error",
        content: `Session creation failed: ${message}`,
      })
    );
    ws.close();
    return;
  }

  // クライアントからのメッセージを受信し、Copilot セッションに転送
  ws.on("message", async (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "chat" && msg.content && session) {
        // session.send() は非同期でキューに追加され、
        // 応答は上記の session.on("assistant.message_delta") で受け取る
        await session.send({ prompt: msg.content });
      }
    } catch (err: unknown) {
      if (ws.readyState === WebSocket.OPEN) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        ws.send(JSON.stringify({ type: "error", content: message }));
      }
    }
  });

  // WebSocket 切断時にセッションをクリーンアップ
  ws.on("close", async () => {
    console.log("WebSocket client disconnected");
    if (session) {
      try {
        await session.disconnect();
      } catch {
        // ignore disconnect errors
      }
      session = null;
    }
  });
});

// ヘルスチェックエンドポイント
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/** サーバー起動: Copilot クライアント初期化 → HTTP サーバーリッスン */
async function main() {
  await startCopilotClient();
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

/** グレースフルシャットダウン: WebSocket → HTTP → Copilot クライアントの順で停止 */
async function shutdown() {
  console.log("Shutting down...");
  wss.close();
  server.close();
  if (client) {
    await client.stop();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
