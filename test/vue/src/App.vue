<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue"
import { createSSEAdapter } from "llm-chat-ui"
import { useChat } from "llm-chat-ui/vue"
import type { ContentBlock } from "llm-chat-ui"
import ChatInput from "./components/chat/ChatInput.vue"
import ChatMessage from "./components/chat/ChatMessage.vue"

const adapter = createSSEAdapter({ url: "/api/chat" })
const { messages, send, isStreaming, clear } = useChat({
  adapter,
  welcomeMessage:
    "Hello! Ask me anything. Try questions that trigger tools:\n\n" +
    '- "What\'s the weather in Tokyo?"\n' +
    '- "Calculate 42 * 17 + 3"\n' +
    '- "Search for information about TypeScript generics"',
})

const inputValue = ref("")
const mode = ref("checking...")
const scrollRef = ref<HTMLElement | null>(null)

onMounted(() => {
  fetch("/api/chat")
    .then((r) => r.json())
    .then((d) => (mode.value = d.mode))
    .catch(() => (mode.value = "mock"))
})

const lastMsg = computed(() => messages.value[messages.value.length - 1])
watch(
  () => [messages.value.length, lastMsg.value?.rawContent, isStreaming.value],
  () => nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }),
)

const actions = computed(() => {
  if (isStreaming.value || !messages.value.length) return []
  const last = [...messages.value].reverse().find((m) => m.role === "assistant")
  if (!last) return []
  const block = last.blocks.find((b): b is ContentBlock & { type: "actions" } => b.type === "actions")
  return block?.actions ?? []
})

function handleSend(text: string, files?: File[]) {
  inputValue.value = ""
  send(text, files)
}
</script>

<template>
  <div class="container">
    <header>
      <div class="header-left">
        <span class="title">llm-chat-ui / Vue</span>
        <span class="badge">{{ mode }}</span>
      </div>
      <button class="clear-btn" @click="clear()">Clear</button>
    </header>

    <div ref="scrollRef" class="messages">
      <ChatMessage
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :is-streaming="isStreaming && msg.id === lastMsg?.id"
      />
      <div v-if="actions.length > 0" class="actions">
        <button
          v-for="action in actions"
          :key="action"
          class="action-btn"
          @click="inputValue = action"
        >
          {{ action }}
        </button>
      </div>
    </div>

    <div class="input-area">
      <ChatInput
        v-model="inputValue"
        :is-loading="isStreaming"
        enable-file-upload
        @send="handleSend"
      />
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #fafafa; color: #111; }

:root {
  --background: #fff;
  --foreground: #111;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --border: #e5e5e5;
}

*::-webkit-scrollbar { width: 4px; height: 4px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.3); border-radius: 4px; }
*::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.5); }
</style>

<style scoped>
.container {
  max-width: 640px;
  margin: 0 auto;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.header-left { display: flex; align-items: center; gap: 12px; }
.title { font-size: 14px; font-weight: 500; }
.badge {
  font-size: 10px;
  color: var(--muted-foreground);
  background: var(--muted);
  padding: 2px 8px;
  border-radius: 9999px;
}
.clear-btn {
  font-size: 12px;
  color: var(--muted-foreground);
  background: none;
  border: none;
  cursor: pointer;
}
.clear-btn:hover { color: var(--foreground); }
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.action-btn {
  cursor: pointer;
  border-radius: 9999px;
  border: 1px solid var(--border);
  padding: 4px 12px;
  font-size: 12px;
  color: var(--muted-foreground);
  background: none;
  transition: background 0.15s, color 0.15s;
}
.action-btn:hover { background: var(--muted); color: var(--foreground); }
.input-area { padding: 16px; }
</style>
