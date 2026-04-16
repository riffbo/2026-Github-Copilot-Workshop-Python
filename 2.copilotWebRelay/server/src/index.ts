import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { CopilotClient, approveAll } from "@github/copilot-sdk";

const PORT = Number(process.env.PORT) || 3001;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

let client: CopilotClient;

async function startCopilotClient() {
  client = new CopilotClient();
  await client.start();
  console.log("Copilot client started");
}

wss.on("connection", async (ws: WebSocket) => {
  console.log("WebSocket client connected");
  let session: Awaited<ReturnType<CopilotClient["createSession"]>> | null =
    null;

  try {
    session = await client.createSession({
      model: "gpt-4.1",
      streaming: true,
      onPermissionRequest: approveAll,
    });

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

    session.on("session.idle", () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "done" }));
      }
    });

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

  ws.on("message", async (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "chat" && msg.content && session) {
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

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

async function main() {
  await startCopilotClient();
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

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
