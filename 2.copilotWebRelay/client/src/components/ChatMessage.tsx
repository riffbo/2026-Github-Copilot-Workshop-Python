/**
 * ChatMessage — チャットメッセージ表示コンポーネント
 *
 * ユーザーメッセージはプレーンテキスト、アシスタントメッセージは
 * Markdown レンダリング（GFM + シンタックスハイライト）で表示する。
 * ストリーミング中は点滅カーソルを表示。
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // GitHub Flavored Markdown（テーブル、取り消し線等）
import rehypeHighlight from "rehype-highlight"; // コードブロックのシンタックスハイライト
import "highlight.js/styles/github-dark.css"; // ハイライトテーマ

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  /** true の場合、AI がまだ応答を生成中（点滅カーソルを表示） */
  isStreaming?: boolean;
}

function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  return (
    <div className={`chat-message ${role}`}>
      <div className="message-bubble">
        {role === "assistant" ? (
          // アシスタント: Markdown をパースしてリッチテキスト表示
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
            {/* ストリーミング中の点滅カーソルインジケータ */}
            {isStreaming && <span className="streaming-cursor" />}
          </div>
        ) : (
          // ユーザー: プレーンテキスト表示
          <span>{content}</span>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
