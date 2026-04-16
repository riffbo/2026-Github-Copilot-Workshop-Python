import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  return (
    <div className={`chat-message ${role}`}>
      <div className="message-bubble">
        {role === "assistant" ? (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && <span className="streaming-cursor" />}
          </div>
        ) : (
          <span>{content}</span>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
