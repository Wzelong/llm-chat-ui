import { useRef, useCallback, useEffect, useMemo } from "react"
import { useStore } from "zustand"
import { createChatStore, type ChatStore } from "./store"
import { createUserMessage, useStreamingMessage } from "./use-streaming-message"
import { parseContentBlocks } from "./content-blocks"
import type { UseChatOptions, UseChatReturn, HistoryItem } from "./types"

export function useChat({
  adapter,
  maxHistory = 10,
  welcomeMessage,
  onError,
}: UseChatOptions): UseChatReturn {
  const storeRef = useRef<ChatStore | null>(null)
  if (!storeRef.current) storeRef.current = createChatStore()
  const store = storeRef.current

  const messages = useStore(store, (s) => s.messages)
  const isStreaming = useStore(store, (s) => s.isStreaming)
  const streaming = useStreamingMessage(store)

  useEffect(() => {
    if (!welcomeMessage || messages.length > 0) return
    store.getState().addMessage({
      id: `welcome-${Date.now()}`,
      role: "assistant",
      blocks: parseContentBlocks(welcomeMessage),
      rawContent: welcomeMessage,
      reasoningSteps: [],
      timestamp: Date.now(),
    })
  }, [welcomeMessage])

  const send = useCallback(
    async (text: string, files?: File[]) => {
      const state = store.getState()
      if (state.isStreaming) return

      const fileData = files?.length
        ? files.map((f) => ({ name: f.name, type: f.type }))
        : undefined

      state.addMessage(createUserMessage(text, fileData))

      const history: HistoryItem[] = state.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.rawContent, files: m.files }))
        .slice(-maxHistory)

      const messageId = streaming.start()

      let reasoningStepId: string | null = null
      let reasoningText = ""
      let stepCounter = 0
      const toolIdMap: Record<string, string> = {}

      try {
        for await (const event of adapter.stream({ message: text, history, files: fileData })) {
          switch (event.type) {
            case "reasoning": {
              reasoningText += event.delta
              if (!reasoningStepId) {
                stepCounter++
                reasoningStepId = `r-${messageId}-${stepCounter}`
                const headerMatch = reasoningText.match(/\*\*(.+?)\*\*/)
                streaming.addStep({
                  id: reasoningStepId,
                  type: "thinking",
                  title: headerMatch?.[1] ?? "Thinking...",
                  content: reasoningText,
                  status: "running",
                })
              } else {
                const headerMatch = reasoningText.match(/\*\*(.+?)\*\*/)
                streaming.updateStep(reasoningStepId, {
                  title: headerMatch?.[1] ?? "Thinking...",
                  content: reasoningText,
                })
              }
              break
            }
            case "tool_start": {
              if (reasoningStepId) {
                streaming.updateStep(reasoningStepId, { status: "success" })
                reasoningStepId = null
                reasoningText = ""
              }
              stepCounter++
              const stepId = `${event.id}-${messageId}-${stepCounter}`
              toolIdMap[event.id] = stepId
              streaming.addStep({
                id: stepId,
                type: "tool",
                title: event.name,
                toolName: event.name,
                icon: event.icon,
                status: "running",
              })
              break
            }
            case "tool_done": {
              const stepId = toolIdMap[event.id] ?? event.id
              streaming.updateStep(stepId, {
                status: "success",
                resultCount: event.count,
                content: event.summary,
              })
              break
            }
            case "text_delta": {
              if (reasoningStepId) {
                streaming.updateStep(reasoningStepId, { status: "success" })
                reasoningStepId = null
              }
              streaming.append(event.delta)
              break
            }
            case "replace_text": {
              streaming.replace(event.text)
              break
            }
            case "error": {
              streaming.append(`\n\nError: ${event.message}`)
              onError?.(event.message)
              streaming.finish()
              return
            }
            case "done": {
              streaming.finish()
              return
            }
          }
        }
        streaming.finish()
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        streaming.append(`\n\nError: ${msg}`)
        onError?.(msg)
        streaming.finish()
      }
    },
    [adapter, maxHistory, streaming, store, onError],
  )

  const clear = useCallback(() => store.getState().clear(), [store])

  return { messages, send, isStreaming, clear }
}
