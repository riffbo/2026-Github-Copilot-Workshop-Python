/**
 * App — メインチャットアプリケーション
 *
 * WebSocket でバックエンドに接続し、Copilot とのリアルタイムチャットを提供する。
 * ストリーミングレスポンスを逐次表示し、チャット履歴を管理する。
 *
 * 状態管理:
 *   - messages: チャット履歴（ユーザー / アシスタント）
 *   - isConnected: WebSocket 接続状態（"ready" 受信後に true）
 *   - isStreaming: AI 応答のストリーミング中かどうか
 */

import { useState, useEffect, useRef, useCallback } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import "./App.css";

/** チャットメッセージの型定義 */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** true の場合、AI がまだ応答を生成中 */
  isStreaming?: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージ追加時に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket 接続の確立とメッセージハンドリング
  // React StrictMode 対策: wsRef.current === ws のガードで古い接続のコールバックを無視
  useEffect(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // サーバーから "ready" メッセージを受信するまで接続完了とみなさない
    };

    ws.onmessage = (event) => {
      // StrictMode で2回マウントされた場合、古い接続のイベントを無視
      if (wsRef.current !== ws) return;

      const msg = JSON.parse(event.data);

      switch (msg.type) {
        // Copilot セッション作成完了 → UI を接続状態に
        case "ready":
          setIsConnected(true);
          break;

        // ストリーミングチャンク: 既存のストリーミング中メッセージに追記、
        // または新しいアシスタントメッセージを作成
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

        // 応答完了: ストリーミングフラグを解除し入力を再有効化
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

        // エラー: エラーメッセージをチャットに表示
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

    // 切断時: StrictMode で古い接続のコールバックが新しい接続を壊さないようガード
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

    // クリーンアップ: ref を先に null にしてから close（コールバックの誤動作を防止）
    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, []);

  /** ユーザーメッセージを送信: チャット履歴に追加 → WebSocket で送信 */
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
      {/* ヘッダー: アプリタイトルと接続状態インジケータ */}
      <header className="app-header">
        <h1>🤖 Copilot Chat</h1>
        <div
          className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}
        >
          <span className="status-dot" />
          {isConnected ? "接続中" : "未接続"}
        </div>
      </header>

      {/* チャットメッセージ表示エリア */}
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
        {/* 自動スクロールのアンカー */}
        <div ref={messagesEndRef} />
      </main>

      {/* 入力エリア: 未接続またはストリーミング中は無効化 */}
      <ChatInput onSend={sendMessage} disabled={!isConnected || isStreaming} />
    </div>
  );
}

export default App;
