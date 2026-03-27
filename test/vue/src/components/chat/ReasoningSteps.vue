<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue"
import { ChevronDown, Wrench, type LucideIcon } from "lucide-vue-next"
import type { ReasoningStep } from "llm-chat-ui"

const TOOL_ICONS: Record<string, LucideIcon> = {}

function getToolIcon(step: ReasoningStep): LucideIcon {
  if (step.icon && TOOL_ICONS[step.icon]) return TOOL_ICONS[step.icon]
  if (step.toolName && TOOL_ICONS[step.toolName]) return TOOL_ICONS[step.toolName]
  return Wrench
}

const props = defineProps<{ steps: ReasoningStep[] }>()

const showAll = ref(true)
const expandedSteps = ref(new Set<string>())
const containerRef = ref<HTMLElement | null>(null)
const lineHeight = ref(0)

function toggleStep(id: string) {
  const next = new Set(expandedSteps.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedSteps.value = next
}

function updateLineHeight() {
  nextTick(() => {
    const el = containerRef.value
    if (!el || props.steps.length < 2) { lineHeight.value = 0; return }
    const children = el.children
    if (children.length < 2) return
    const first = children[0] as HTMLElement
    const last = children[children.length - 1] as HTMLElement
    lineHeight.value = last.offsetTop - first.offsetTop
  })
}

watch(() => [props.steps.length, expandedSteps.value, showAll.value], updateLineHeight)
onMounted(updateLineHeight)
</script>

<template>
  <div v-if="steps.length > 0" class="reasoning-steps">
    <button class="toggle-btn" @click="showAll = !showAll">
      <ChevronDown :size="16" :class="{ collapsed: !showAll }" class="chevron" />
      {{ showAll ? "Hide steps" : "Show steps" }}
    </button>
    <div v-if="showAll" class="steps-container">
      <div
        v-if="steps.length > 1 && lineHeight > 0"
        class="connecting-line"
        :style="{ top: '16px', height: lineHeight + 'px' }"
      />
      <div ref="containerRef">
        <div v-for="step in steps" :key="step.id" class="step-row">
          <div class="step-icon-col">
            <template v-if="step.type === 'thinking'">
              <div class="dot" />
            </template>
            <template v-else>
              <div class="icon-bg" />
              <component :is="getToolIcon(step)" :size="14" class="icon" />
            </template>
          </div>
          <button
            class="step-content"
            :class="{ clickable: !!step.content }"
            @click="step.content ? toggleStep(step.id) : undefined"
          >
            <span class="step-title" :class="{ pulse: step.status === 'running' }">{{ step.title }}</span>
            <span v-if="step.type === 'tool' && step.resultCount && step.resultCount > 0 && step.status === 'success'" class="result-count">
              {{ step.resultCount }} results
            </span>
            <ChevronDown
              :size="16"
              class="expand-chevron"
              :class="{ rotated: expandedSteps.has(step.id), invisible: !step.content }"
            />
          </button>
          <div v-if="expandedSteps.has(step.id) && step.content" class="step-detail">
            <div
              v-for="(line, i) in step.content.split('\n').filter(Boolean)"
              :key="i"
              class="detail-line"
            >
              {{ line }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reasoning-steps { margin-bottom: 8px; }
.toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--muted-foreground, #888);
  cursor: pointer;
  background: none;
  border: none;
  margin-bottom: 8px;
  padding: 0;
}
.chevron { transition: transform 0.2s; }
.chevron.collapsed { transform: rotate(-90deg); }
.steps-container { position: relative; }
.connecting-line {
  position: absolute;
  left: 8px;
  width: 1px;
  background: rgba(128, 128, 128, 0.3);
  transform: translateX(-50%);
}
.step-row { position: relative; }
.step-icon-col {
  position: absolute;
  left: 0;
  top: 0;
  width: 16px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--muted-foreground, #888); }
.icon-bg { position: absolute; width: 12px; height: 12px; background: var(--background, #fff); }
.icon { position: relative; color: var(--muted-foreground, #888); }
.pulse { animation: breathe 2.5s ease-in-out infinite; }
@keyframes breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.step-content {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  margin-left: 24px;
  background: none;
  border: none;
  text-align: left;
  width: calc(100% - 24px);
  min-width: 0;
  padding: 0;
}
.step-content.clickable { cursor: pointer; }
.step-title { flex: 1; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-count { font-size: 12px; color: rgba(128, 128, 128, 0.5); flex-shrink: 0; width: 64px; text-align: right; }
.expand-chevron { flex-shrink: 0; color: var(--muted-foreground, #888); transition: transform 0.2s; }
.expand-chevron.rotated { transform: rotate(180deg); }
.expand-chevron.invisible { visibility: hidden; }
.step-detail { margin: 4px 0 4px 24px; max-height: 192px; overflow-y: auto; }
.detail-line { font-size: 11px; color: rgba(128, 128, 128, 0.7); font-family: monospace; overflow-wrap: break-word; }
</style>
