import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Loader2 } from "lucide-react"
import { clsx } from "clsx"
import { ReasoningSteps } from "./reasoning-steps"
import { FileChip } from "./file-chip"
import type { Message } from "llm-chat-ui"

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

function FileChips({ message }: { message: Message }) {
  if (!message.files?.length) return null
  return (
    <div className="flex gap-1.5 overflow-x-auto py-1">
      {message.files.map((file, i) => (
        <FileChip key={`${file.name}-${i}`} file={file} />
      ))}
    </div>
  )
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={clsx(
        "w-full",
        isUser ? "flex flex-col items-end" : "flex flex-col items-start",
      )}
    >
      {isUser && <FileChips message={message} />}
      {isUser && (!message.blocks[0] || (message.blocks[0].type === "text" && !message.blocks[0].text)) ? null : (
      <div
        className={clsx(
          "rounded-2xl py-2 text-sm",
          isUser
            ? "max-w-[88%] bg-muted px-3.5"
            : "max-w-[88%] w-[88%] bg-background px-1",
        )}
      >
        {isUser ? (
          message.blocks[0]?.type === "text" ? message.blocks[0].text : ""
        ) : (
          <>
            {message.reasoningSteps.length > 0 && (
              <ReasoningSteps steps={message.reasoningSteps} />
            )}
            {message.blocks.map((block, i) => {
              if (block.type === "text") {
                return (
                  <div
                    key={i}
                    className="markdown max-w-none break-words whitespace-normal text-sm"
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {block.text}
                    </ReactMarkdown>
                  </div>
                )
              }
              return null
            })}
            {isStreaming && message.blocks.length === 0 && (
              <div className="flex items-center gap-2 h-8">
                <div className="size-4 flex items-center justify-center shrink-0">
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      )}
    </div>
  )
}
