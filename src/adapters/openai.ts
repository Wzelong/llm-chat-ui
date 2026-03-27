import type { ChatAdapter, ChatEvent, HistoryItem } from "../types"

export interface OpenAIAdapterOptions {
  apiKey: string
  model?: string
  systemPrompt?: string
  baseURL?: string
}

export function createOpenAIAdapter(options: OpenAIAdapterOptions): ChatAdapter {
  const {
    apiKey,
    model = "gpt-5.4-mini",
    systemPrompt,
    baseURL = "https://api.openai.com/v1",
  } = options

  return {
    async *stream({ message, history }) {
      const messages: { role: string; content: string }[] = []
      if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
      for (const h of history) messages.push({ role: h.role, content: h.content })
      messages.push({ role: "user", content: message })

      const res = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, stream: true }),
      })

      if (!res.ok) {
        yield { type: "error" as const, message: `OpenAI API error: ${res.status}` }
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
          const payload = line.slice(6).trim()
          if (payload === "[DONE]") {
            yield { type: "done" as const }
            return
          }
          try {
            const chunk = JSON.parse(payload)
            const delta = chunk.choices?.[0]?.delta?.content
            if (delta) yield { type: "text_delta" as const, delta }
          } catch {}
        }
      }

      yield { type: "done" as const }
    },
  }
}
