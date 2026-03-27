import { parseSSEStream } from "../sse-parser"
import type { ChatAdapter, ChatEvent, HistoryItem } from "../types"

export interface SSEAdapterOptions {
  url: string
  headers?: Record<string, string>
  buildBody?: (params: { message: string; history: HistoryItem[] }) => unknown
}

export function createSSEAdapter(options: SSEAdapterOptions): ChatAdapter {
  return {
    async *stream({ message, history }) {
      const body = options.buildBody
        ? options.buildBody({ message, history })
        : { message, history }

      const res = await fetch(options.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(body),
      })

      yield* parseSSEStream(res)
    },
  }
}
