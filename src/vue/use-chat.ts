import { ref, onMounted } from "vue"
import { parseContentBlocks } from "../content-blocks"
import type { ChatAdapter, Message, FileData, ReasoningStep, HistoryItem } from "../types"

function createId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface UseChatOptions {
  adapter: ChatAdapter
  maxHistory?: number
  welcomeMessage?: string
  onError?: (error: string) => void
}

export function useChat(options: UseChatOptions) {
  const { adapter, maxHistory = 10, welcomeMessage, onError } = options

  const messages = ref<Message[]>([])
  const isStreaming = ref(false)

  onMounted(() => {
    if (welcomeMessage && messages.value.length === 0) {
      messages.value.push({
        id: `welcome-${Date.now()}`,
        role: "assistant",
        blocks: parseContentBlocks(welcomeMessage),
        rawContent: welcomeMessage,
        reasoningSteps: [],
        timestamp: Date.now(),
      })
    }
  })

  function findMessage(id: string): Message | undefined {
    return messages.value.find((m) => m.id === id)
  }

  async function send(text: string, files?: File[]) {
    if (isStreaming.value) return

    const fileData: FileData[] | undefined = files?.length
      ? files.map((f) => ({ name: f.name, type: f.type }))
      : undefined

    const userMsg: Message = {
      id: createId(),
      role: "user",
      blocks: [{ type: "text", text }],
      rawContent: text,
      reasoningSteps: [],
      files: fileData,
      timestamp: Date.now(),
    }
    messages.value.push(userMsg)

    const assistantId = createId()
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      blocks: [],
      rawContent: "",
      reasoningSteps: [],
      timestamp: Date.now(),
    }
    messages.value.push(assistantMsg)
    isStreaming.value = true

    const history: HistoryItem[] = messages.value
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.rawContent, files: m.files }))
      .slice(-maxHistory)

    let reasoningStepId: string | null = null
    let reasoningText = ""
    let stepCounter = 0
    const toolIdMap: Record<string, string> = {}

    try {
      for await (const event of adapter.stream({ message: text, history, files: fileData })) {
        const msg = findMessage(assistantId)
        if (!msg) break

        switch (event.type) {
          case "reasoning": {
            reasoningText += event.delta
            if (!reasoningStepId) {
              stepCounter++
              reasoningStepId = `r-${assistantId}-${stepCounter}`
              const headerMatch = reasoningText.match(/\*\*(.+?)\*\*/)
              msg.reasoningSteps.push({
                id: reasoningStepId,
                type: "thinking",
                title: headerMatch?.[1] ?? "Thinking...",
                content: reasoningText,
                status: "running",
              })
            } else {
              const step = msg.reasoningSteps.find((s) => s.id === reasoningStepId)
              if (step) {
                const headerMatch = reasoningText.match(/\*\*(.+?)\*\*/)
                step.title = headerMatch?.[1] ?? "Thinking..."
                step.content = reasoningText
              }
            }
            break
          }
          case "tool_start": {
            if (reasoningStepId) {
              const step = msg.reasoningSteps.find((s) => s.id === reasoningStepId)
              if (step) step.status = "success"
              reasoningStepId = null
              reasoningText = ""
            }
            stepCounter++
            const stepId = `${event.id}-${assistantId}-${stepCounter}`
            toolIdMap[event.id] = stepId
            msg.reasoningSteps.push({
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
            const step = msg.reasoningSteps.find((s) => s.id === stepId)
            if (step) {
              step.status = "success"
              step.resultCount = event.count
              step.content = event.summary
            }
            break
          }
          case "text_delta": {
            if (reasoningStepId) {
              const step = msg.reasoningSteps.find((s) => s.id === reasoningStepId)
              if (step) step.status = "success"
              reasoningStepId = null
            }
            msg.rawContent += event.delta
            msg.blocks = parseContentBlocks(msg.rawContent)
            break
          }
          case "replace_text": {
            msg.rawContent = event.text
            msg.blocks = parseContentBlocks(event.text)
            break
          }
          case "error": {
            msg.rawContent += `\n\nError: ${event.message}`
            msg.blocks = parseContentBlocks(msg.rawContent)
            onError?.(event.message)
            isStreaming.value = false
            return
          }
          case "done": {
            isStreaming.value = false
            return
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error"
      const msg = findMessage(assistantId)
      if (msg) {
        msg.rawContent += `\n\nError: ${errMsg}`
        msg.blocks = parseContentBlocks(msg.rawContent)
      }
      onError?.(errMsg)
    }
    isStreaming.value = false
  }

  function clear() {
    messages.value = []
  }

  return { messages, send, isStreaming, clear }
}
