export type ChatEvent =
  | { type: "text_delta"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "tool_start"; id: string; name: string; icon?: string; args?: Record<string, unknown> }
  | { type: "tool_done"; id: string; count?: number; summary?: string }
  | { type: "replace_text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }

export interface FileData {
  name: string
  type: string
}

export interface ChatAdapter {
  stream(params: {
    message: string
    history: HistoryItem[]
    files?: FileData[]
  }): AsyncIterable<ChatEvent>
}

export interface HistoryItem {
  role: "user" | "assistant"
  content: string
  files?: FileData[]
}

export interface ReasoningStep {
  id: string
  type: "thinking" | "tool"
  title: string
  content?: string
  toolName?: string
  icon?: string
  status: "running" | "success" | "error"
  resultCount?: number
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "actions"; actions: string[] }
  | { type: "custom"; name: string; data: unknown }

export interface Message {
  id: string
  role: "user" | "assistant"
  blocks: ContentBlock[]
  rawContent: string
  reasoningSteps: ReasoningStep[]
  files?: FileData[]
  timestamp: number
}

export interface ChatState {
  messages: Message[]
  isStreaming: boolean
}

export interface UseChatOptions {
  adapter: ChatAdapter
  maxHistory?: number
  welcomeMessage?: string
  onError?: (error: string) => void
}

export interface UseChatReturn {
  messages: Message[]
  send: (text: string, files?: File[]) => Promise<void>
  isStreaming: boolean
  clear: () => void
}
