import { useRef, useCallback } from "react"
import { parseContentBlocks } from "./content-blocks"
import type { Message, ReasoningStep, FileData } from "./types"
import type { ChatStore } from "./store"

function createId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useStreamingMessage(store: ChatStore) {
  const messageIdRef = useRef<string | null>(null)

  const { addMessage, appendDelta, replaceContent, addReasoningStep, updateReasoningStep, setStreaming } =
    store.getState()

  const start = useCallback((): string => {
    const id = createId()
    messageIdRef.current = id
    const msg: Message = {
      id,
      role: "assistant",
      blocks: [],
      rawContent: "",
      reasoningSteps: [],
      timestamp: Date.now(),
    }
    addMessage(msg)
    setStreaming(true)
    return id
  }, [addMessage, setStreaming])

  const append = useCallback(
    (delta: string) => {
      if (messageIdRef.current) appendDelta(messageIdRef.current, delta)
    },
    [appendDelta],
  )

  const replace = useCallback(
    (text: string) => {
      if (messageIdRef.current) replaceContent(messageIdRef.current, text)
    },
    [replaceContent],
  )

  const addStep = useCallback(
    (step: ReasoningStep) => {
      if (messageIdRef.current) addReasoningStep(messageIdRef.current, step)
    },
    [addReasoningStep],
  )

  const updateStep = useCallback(
    (stepId: string, updates: Partial<ReasoningStep>) => {
      if (messageIdRef.current) updateReasoningStep(messageIdRef.current, stepId, updates)
    },
    [updateReasoningStep],
  )

  const finish = useCallback(() => {
    messageIdRef.current = null
    setStreaming(false)
  }, [setStreaming])

  return { start, append, replace, addStep, updateStep, finish }
}

export function createUserMessage(text: string, files?: FileData[]): Message {
  return {
    id: createId(),
    role: "user",
    blocks: [{ type: "text", text }],
    rawContent: text,
    reasoningSteps: [],
    files: files?.length ? files : undefined,
    timestamp: Date.now(),
  }
}
