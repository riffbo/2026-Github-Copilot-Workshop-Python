import { useState, useEffect, useRef, useCallback } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import "./App.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Wait for "ready" message before marking connected
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;

      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "ready":
          setIsConnected(true);
          break;

        case "delta":
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.isStreaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + msg.content },
              ];
            }
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: msg.content,
                isStreaming: true,
              },
            ];
          });
          setIsStreaming(true);
          break;

        case "done":
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.isStreaming) {
              return [...prev.slice(0, -1), { ...last, isStreaming: false }];
            }
            return prev;
          });
          setIsStreaming(false);
          break;

        case "error":
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `⚠️ エラー: ${msg.content}`,
            },
          ]);
          setIsStreaming(false);
          break;
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        setIsConnected(false);
        wsRef.current = null;
      }
    };

    ws.onerror = () => {
      if (wsRef.current === ws) {
        setIsConnected(false);
      }
    };

    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content },
    ]);

    wsRef.current.send(JSON.stringify({ type: "chat", content }));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 Copilot Chat</h1>
        <div
          className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}
        >
          <span className="status-dot" />
          {isConnected ? "接続中" : "未接続"}
        </div>
      </header>

      <main className="messages-container">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>💬 メッセージを送信して Copilot とチャットを始めましょう</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
          />
        ))}
        <div ref={messagesEndRef} />
      </main>

      <ChatInput onSend={sendMessage} disabled={!isConnected || isStreaming} />
    </div>
  );
}

export default App;
