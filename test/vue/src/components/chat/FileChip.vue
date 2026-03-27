<script setup lang="ts">
import { computed } from "vue"
import { FileText, FileImage, File as FileIcon } from "lucide-vue-next"
import type { FileData } from "llm-chat-ui"

const props = defineProps<{ file: FileData }>()

const fileType = computed(() => {
  const type = props.file.type
  if (type.startsWith("image/")) return { icon: FileImage, label: "Image" }
  if (type === "application/pdf") return { icon: FileText, label: "PDF" }
  if (type.startsWith("text/") || type.includes("word") || type.includes("document"))
    return { icon: FileText, label: "Document" }
  return { icon: FileIcon, label: "File" }
})
</script>

<template>
  <div class="file-chip">
    <component :is="fileType.icon" class="icon" />
    <div class="info">
      <span class="name">{{ file.name }}</span>
      <span class="label">{{ fileType.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.file-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  width: 110px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid var(--border, #e5e5e5);
  padding: 0 8px;
}
.icon { width: 16px; height: 16px; flex-shrink: 0; color: var(--muted-foreground, #888); }
.info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.name { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.label { font-size: 10px; color: var(--muted-foreground, #888); }
</style>
