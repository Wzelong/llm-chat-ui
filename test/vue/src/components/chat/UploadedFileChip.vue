<script setup lang="ts">
import { computed } from "vue"
import { X, FileText, FileImage, File as FileIcon } from "lucide-vue-next"

const props = defineProps<{ file: File }>()
const emit = defineEmits<{ remove: [] }>()

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
  <div class="uploaded-chip">
    <component :is="fileType.icon" class="icon" />
    <div class="info">
      <span class="name">{{ file.name }}</span>
      <span class="label">{{ fileType.label }}</span>
    </div>
    <button class="remove-btn" @click="emit('remove')">
      <X :size="10" />
    </button>
  </div>
</template>

<style scoped>
.uploaded-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  width: 180px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid var(--border, #e5e5e5);
  background: var(--background, #fff);
  padding: 0 12px;
}
.icon { width: 20px; height: 20px; flex-shrink: 0; color: var(--muted-foreground, #888); }
.info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.name { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.label { font-size: 12px; color: var(--muted-foreground, #888); }
.remove-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: var(--muted, #f0f0f0);
  color: var(--foreground, #111);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.uploaded-chip:hover .remove-btn { opacity: 1; }
</style>
