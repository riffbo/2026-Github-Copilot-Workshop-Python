/**
 * ChatInput — メッセージ入力コンポーネント
 *
 * テキスト入力欄と送信ボタンを提供する。
 * Enter キーで送信（Shift+Enter は改行用に予約）。
 * 未接続時やストリーミング中は disabled で無効化される。
 */

import { useState, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  /** true の場合、入力欄と送信ボタンを無効化 */
  disabled?: boolean;
}

function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  /** 入力値をトリムして送信し、入力欄をクリア */
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  /** Enter キーで送信（Shift+Enter は除外） */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-area">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="メッセージを入力..."
        disabled={disabled}
      />
      <button onClick={handleSend} disabled={disabled || !input.trim()}>
        送信 ▶
      </button>
    </div>
  );
}

export default ChatInput;
