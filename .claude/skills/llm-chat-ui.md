---
description: Reference for building with the llm-chat-ui package -- adapters, templates, SSE protocol, and framework integration
globs: ["src/**", "cli/**", "test/**"]
---

# llm-chat-ui

Portable LLM chat UI library. Provides hooks, adapters, and template components for React, Vue, and Angular.

## Package Structure

```
src/
  index.ts              # Main exports (React hooks + all adapters)
  types.ts              # All type definitions
  use-chat.ts           # React useChat hook (zustand-based)
  use-streaming-message.ts  # Low-level streaming helper
  store.ts              # Zustand chat store
  content-blocks.ts     # :::block parser (exported as llm-chat-ui/parser)
  sse-parser.ts         # SSE response parser
  adapters/
    sse.ts              # createSSEAdapter
    openai.ts           # createOpenAIAdapter
    anthropic.ts        # createAnthropicAdapter
  vue/
    use-chat.ts         # Vue 3 composable (ref-based)

cli/
  index.ts              # npx llm-chat-ui add [--vue | --angular]
  templates/            # React TSX (Tailwind)
  templates/vue/        # Vue SFCs (scoped CSS)
  templates/angular/    # Angular standalone components (inline CSS + SVG icons)
```

## Export Paths

- `llm-chat-ui` -- React hooks, adapters, types (imports React + Zustand)
- `llm-chat-ui/vue` -- Vue composable
- `llm-chat-ui/adapters/sse` -- SSE adapter only (no React dependency)
- `llm-chat-ui/adapters/openai` -- OpenAI adapter only
- `llm-chat-ui/adapters/anthropic` -- Anthropic adapter only
- `llm-chat-ui/parser` -- parseContentBlocks (no React dependency)
- `llm-chat-ui/types` -- TypeScript types only

Angular apps must use subpath imports (`/adapters/sse`, `/parser`, `/types`) to avoid bundling React.

## SSE Event Protocol

Backends must emit `data: {json}\n\n` lines. Event types:

| Type | Fields | Purpose |
|------|--------|---------|
| `text_delta` | `delta: string` | Streaming text chunk |
| `reasoning` | `delta: string` | LLM reasoning/thinking |
| `tool_start` | `id, name, icon?, args?` | Tool invocation begins |
| `tool_done` | `id, count?, summary?` | Tool completed |
| `replace_text` | `text: string` | Replace full response text |
| `done` | -- | Stream complete |
| `error` | `message: string` | Error occurred |

## Creating a Custom Adapter

```typescript
const adapter: ChatAdapter = {
  async *stream({ message, history, files }) {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    })
    // Use built-in SSE parser
    yield* parseSSEStream(res)
  },
}
```

## Template Components

After `npx llm-chat-ui add`, users own these files:

- `chat-input` -- Textarea + send button + optional file upload (`enableFileUpload` prop)
- `chat-message` -- Message bubble with markdown, reasoning steps, file chips
- `reasoning-steps` -- Expandable thinking/tool steps with configurable `TOOL_ICONS` map
- `uploaded-file-chip` -- Removable file chip in input area
- `file-chip` -- Read-only file chip in sent messages

## Key Patterns

**Actions** (suggested follow-ups): Parsed from `:::actions` blocks but rendered at page level, not in templates. Extract from last assistant message's blocks.

**File upload**: Opt-in via prop. Files passed as `File[]` to `send()`, stored as `FileData` metadata on messages. No upload/encoding -- user handles that.

**Auto-scroll**: Page-level concern. Watch `messages.length` + `lastMsg.rawContent` + `isStreaming`.

**Tool icons**: React template has empty `TOOL_ICONS` map. User fills it with lucide icons after copying. Or backend sends `icon` field in `tool_start` event.

## Test Apps

- `test/nextjs/` -- Full React integration (port 3100, self-contained API route)
- `test/vue/` -- Vue 3 + Vite (port 3200, proxies to FastAPI backend)
- `test/angular/` -- Angular 19 (port 3300, proxies to FastAPI backend)
- `test/backend/` -- FastAPI SSE server with OpenAI tool use (port 8000)
