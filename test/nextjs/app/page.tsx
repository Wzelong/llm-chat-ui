"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useChat, createSSEAdapter } from "llm-chat-ui"
import type { ContentBlock } from "llm-chat-ui"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessage } from "@/components/chat/chat-message"

const liveAdapter = createSSEAdapter({ url: "/api/chat" })
const demoAdapter = createSSEAdapter({ url: "/api/chat/demo" })

export default function Home() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get("demo") !== null

  const adapter = isDemo ? demoAdapter : liveAdapter

  const { messages, send, isStreaming, clear } = useChat({
    adapter,
    welcomeMessage: isDemo
      ? "Upload an image and ask me to analyze the design."
      : "Hello! Ask me anything. Try questions that trigger tools:\n\n" +
        "- \"What's the weather in Tokyo?\"\n" +
        "- \"Calculate 42 * 17 + 3\"\n" +
        "- \"Search for information about TypeScript generics\"",
  })
  const [inputValue, setInputValue] = useState("")
  const [mode, setMode] = useState<string>(isDemo ? "demo" : "checking...")
  const scrollRef = useRef<HTMLDivElement>(null)

  const lastMsg = messages[messages.length - 1]
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, lastMsg?.rawContent, isStreaming])

  useEffect(() => {
    if (isDemo) return
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setMode(d.mode))
      .catch(() => setMode("mock"))
  }, [isDemo])

  const actions = useMemo(() => {
    if (isStreaming || !messages.length) return []
    const last = [...messages].reverse().find((m) => m.role === "assistant")
    if (!last) return []
    const block = last.blocks.find((b): b is ContentBlock & { type: "actions" } => b.type === "actions")
    return block?.actions ?? []
  }, [messages, isStreaming])

  const handleSend = (text: string, files?: File[]) => {
    setInputValue("")
    send(text, files)
  }

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col border-x">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">llm-chat-ui / Next.js</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {mode}
          </span>
        </div>
        <button
          onClick={clear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={
              isStreaming && msg.id === messages[messages.length - 1]?.id
            }
          />
        ))}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setInputValue(action)}
                className="cursor-pointer rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pb-4">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          isLoading={isStreaming}
          enableFileUpload
        />
      </div>
    </div>
  )
}
