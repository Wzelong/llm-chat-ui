<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue"
import { ArrowUp, Paperclip } from "lucide-vue-next"
import UploadedFileChip from "./UploadedFileChip.vue"

const props = withDefaults(defineProps<{
  modelValue?: string
  isLoading?: boolean
  placeholder?: string
  enableFileUpload?: boolean
}>(), {
  modelValue: "",
  isLoading: false,
  placeholder: "Send a message...",
  enableFileUpload: false,
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
  send: [message: string, files?: File[]]
}>()

const files = ref<File[]>([])
const isMultiline = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const hasFiles = computed(() => files.value.length > 0)
const isExpanded = computed(() => isMultiline.value || hasFiles.value)
const canSend = computed(() => (props.modelValue.trim() || hasFiles.value) && !props.isLoading)

function resize() {
  const textarea = textareaRef.value
  if (!textarea) return
  textarea.style.height = "0"
  const scrollHeight = Math.min(textarea.scrollHeight, 120)
  textarea.style.height = `${scrollHeight}px`
  textarea.style.overflowY = textarea.scrollHeight > 120 ? "auto" : "hidden"
  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
  isMultiline.value = textarea.scrollHeight > lineHeight * 1.5
}

watch(() => props.modelValue, () => nextTick(resize))

function handleSend() {
  const message = props.modelValue.trim()
  if ((!message && !hasFiles.value) || props.isLoading) return
  emit("update:modelValue", "")
  const sendFiles = files.value.length > 0 ? [...files.value] : undefined
  files.value = []
  isMultiline.value = false
  if (textareaRef.value) textareaRef.value.style.height = "auto"
  emit("send", message, sendFiles)
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function onInput(e: Event) {
  emit("update:modelValue", (e.target as HTMLTextAreaElement).value)
  resize()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    files.value = [...files.value, ...Array.from(input.files)]
  }
  if (fileInputRef.value) fileInputRef.value.value = ""
}

function removeFile(index: number) {
  files.value = files.value.filter((_, i) => i !== index)
}
</script>

<template>
  <div class="chat-input" :class="{ expanded: isExpanded }">
    <div v-if="hasFiles" class="file-row">
      <UploadedFileChip
        v-for="(file, index) in files"
        :key="`${file.name}-${index}`"
        :file="file"
        @remove="removeFile(index)"
      />
    </div>
    <div class="input-row">
      <template v-if="enableFileUpload">
        <input ref="fileInputRef" type="file" multiple @change="onFileChange" class="hidden" />
        <button
          class="attach-btn"
          :disabled="isLoading"
          @click="fileInputRef?.click()"
        >
          <Paperclip :size="16" />
        </button>
      </template>
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="onInput"
        @keydown="onKeyDown"
        :placeholder="placeholder"
        :disabled="isLoading"
        rows="1"
        class="textarea"
      />
      <button
        class="send-btn"
        :class="{ active: canSend }"
        :disabled="!canSend"
        @click="handleSend"
      >
        <ArrowUp :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid var(--border, #e5e5e5);
  background: var(--background, #fff);
  padding: 8px;
  transition: border-color 0.15s, border-radius 0.15s;
  border-radius: 9999px;
}
.chat-input.expanded { border-radius: 16px; }
.chat-input:focus-within { border-color: rgba(0, 0, 0, 0.4); }
.file-row { display: flex; gap: 8px; overflow-x: auto; padding: 4px 4px 4px; }
.input-row { display: flex; align-items: flex-end; }
.hidden { display: none; }
.attach-btn {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: none;
  color: var(--muted-foreground, #888);
  cursor: pointer;
  transition: color 0.15s;
}
.attach-btn:hover { color: var(--foreground, #111); }
.attach-btn:disabled { cursor: not-allowed; opacity: 0.5; }
.textarea {
  flex: 1;
  resize: none;
  border: none;
  background: transparent;
  padding: 4px 8px;
  font-size: 14px;
  line-height: 20px;
  outline: none;
  font-family: inherit;
  min-height: 20px;
  max-height: 120px;
}
.textarea::placeholder { color: var(--muted-foreground, #888); }
.textarea:disabled { cursor: not-allowed; opacity: 0.5; }
.send-btn {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  cursor: not-allowed;
  background: var(--muted, #e5e5e5);
  color: var(--muted-foreground, #888);
  transition: background 0.15s, color 0.15s;
}
.send-btn.active {
  cursor: pointer;
  background: var(--foreground, #111);
  color: var(--background, #fff);
}
.send-btn.active:hover { opacity: 0.8; }
</style>
