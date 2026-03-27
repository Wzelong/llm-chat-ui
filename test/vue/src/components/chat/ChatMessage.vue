<script setup lang="ts">
import { computed } from "vue"
import MarkdownIt from "markdown-it"
import ReasoningSteps from "./ReasoningSteps.vue"
import FileChip from "./FileChip.vue"
import type { Message } from "llm-chat-ui"

const props = defineProps<{
  message: Message
  isStreaming?: boolean
}>()

const md = new MarkdownIt()
const isUser = computed(() => props.message.role === "user")
const userText = computed(() => props.message.blocks[0]?.type === "text" ? props.message.blocks[0].text : "")
const textBlocks = computed(() => props.message.blocks.filter((b) => b.type === "text"))
const hasFiles = computed(() => (props.message.files?.length ?? 0) > 0)
const showSpinner = computed(() => props.isStreaming && props.message.blocks.length === 0 && props.message.reasoningSteps.length === 0)
</script>

<template>
  <div class="message-row" :class="{ user: isUser, assistant: !isUser }">
    <div v-if="isUser && hasFiles" class="file-row user-files">
      <FileChip v-for="(file, i) in message.files" :key="`${file.name}-${i}`" :file="file" />
    </div>
    <div v-if="!isUser || userText" class="bubble" :class="isUser ? 'user-bubble' : 'assistant-bubble'">
      <template v-if="isUser">
        {{ userText }}
      </template>
      <template v-else>
        <ReasoningSteps v-if="message.reasoningSteps.length > 0" :steps="message.reasoningSteps" />
        <div
          v-for="(block, i) in textBlocks"
          :key="i"
          class="markdown-content"
          v-html="md.render((block as { type: 'text'; text: string }).text)"
        />
        <div v-if="showSpinner" class="spinner-row">
          <div class="spinner" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.message-row { width: 100%; display: flex; flex-direction: column; }
.message-row.user { align-items: flex-end; }
.message-row.assistant { align-items: flex-start; }
.user-files { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0; }
.bubble { border-radius: 16px; padding: 8px 0; font-size: 14px; max-width: 88%; }
.user-bubble { background: var(--muted, #f0f0f0); padding: 8px 14px; }
.assistant-bubble { width: 88%; padding: 8px 4px; }
.markdown-content { word-break: break-word; white-space: normal; line-height: 1.6; }
.markdown-content :deep(p) { margin: 4px 0; }
.markdown-content :deep(h1), .markdown-content :deep(h2), .markdown-content :deep(h3) { margin: 8px 0; }
.markdown-content :deep(ul), .markdown-content :deep(ol) { margin: 4px 0; padding-left: 20px; }
.markdown-content :deep(code) { background: var(--muted, #f0f0f0); padding: 1px 4px; border-radius: 4px; font-size: 13px; }
.markdown-content :deep(pre) { background: var(--muted, #f0f0f0); padding: 12px; border-radius: 8px; overflow-x: auto; }
.markdown-content :deep(pre code) { background: none; padding: 0; }
.markdown-content :deep(strong) { font-weight: 600; }
.spinner-row { display: flex; align-items: center; height: 32px; }
.spinner {
  width: 14px; height: 14px;
  border: 2px solid var(--muted, #e5e5e5);
  border-top-color: var(--muted-foreground, #888);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
