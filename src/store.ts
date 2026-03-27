import { create } from "zustand"
import { parseContentBlocks } from "./content-blocks"
import type { Message, ReasoningStep } from "./types"

interface ChatStoreState {
  messages: Message[]
  isStreaming: boolean
  addMessage: (message: Message) => void
  appendDelta: (messageId: string, delta: string) => void
  replaceContent: (messageId: string, text: string) => void
  addReasoningStep: (messageId: string, step: ReasoningStep) => void
  updateReasoningStep: (messageId: string, stepId: string, updates: Partial<ReasoningStep>) => void
  setStreaming: (streaming: boolean) => void
  clear: () => void
}

export type ChatStore = ReturnType<typeof createChatStore>

export function createChatStore() {
  return create<ChatStoreState>((set) => ({
    messages: [],
    isStreaming: false,

    addMessage: (message) =>
      set((s) => ({ messages: [...s.messages, message] })),

    appendDelta: (messageId, delta) =>
      set((s) => ({
        messages: s.messages.map((m) => {
          if (m.id !== messageId) return m
          const rawContent = m.rawContent + delta
          return { ...m, rawContent, blocks: parseContentBlocks(rawContent) }
        }),
      })),

    replaceContent: (messageId, text) =>
      set((s) => ({
        messages: s.messages.map((m) => {
          if (m.id !== messageId) return m
          return { ...m, rawContent: text, blocks: parseContentBlocks(text) }
        }),
      })),

    addReasoningStep: (messageId, step) =>
      set((s) => ({
        messages: s.messages.map((m) => {
          if (m.id !== messageId) return m
          return { ...m, reasoningSteps: [...m.reasoningSteps, step] }
        }),
      })),

    updateReasoningStep: (messageId, stepId, updates) =>
      set((s) => ({
        messages: s.messages.map((m) => {
          if (m.id !== messageId) return m
          return {
            ...m,
            reasoningSteps: m.reasoningSteps.map((step) =>
              step.id === stepId ? { ...step, ...updates } : step,
            ),
          }
        }),
      })),

    setStreaming: (isStreaming) => set({ isStreaming }),

    clear: () => set({ messages: [], isStreaming: false }),
  }))
}
