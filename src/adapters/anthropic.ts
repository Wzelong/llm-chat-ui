import type { ChatAdapter, ChatEvent, HistoryItem } from "../types"

export interface AnthropicAdapterOptions {
  apiKey: string
  model?: string
  systemPrompt?: string
  baseURL?: string
  maxTokens?: number
}

export function createAnthropicAdapter(options: AnthropicAdapterOptions): ChatAdapter {
  const {
    apiKey,
    model = "claude-sonnet-4-20250514",
    systemPrompt,
    baseURL = "https://api.anthropic.com/v1",
    maxTokens = 4096,
  } = options

  return {
    async *stream({ message, history }) {
      const messages: { role: string; content: string }[] = []
      for (const h of history) messages.push({ role: h.role, content: h.content })
      messages.push({ role: "user", content: message })

      const body: Record<string, unknown> = {
        model,
        messages,
        max_tokens: maxTokens,
        stream: true,
      }
      if (systemPrompt) body.system = systemPrompt

      const res = await fetch(`${baseURL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        yield { type: "error" as const, message: `Anthropic API error: ${res.status}` }
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              yield { type: "text_delta" as const, delta: event.delta.text }
            }
            if (event.type === "message_stop") {
              yield { type: "done" as const }
              return
            }
            if (event.type === "thinking" && event.thinking) {
              yield { type: "reasoning" as const, delta: event.thinking }
            }
          } catch {}
        }
      }

      yield { type: "done" as const }
    },
  }
}
