import type { ContentBlock } from "./types"

export type BlockParser = (type: string, content: string) => ContentBlock | null

const BLOCK_REGEX = /:::(\w+)\n([\s\S]*?)\n:::/g

const builtinParsers: Record<string, BlockParser> = {
  actions: (_type, content) => {
    try {
      const actions = JSON.parse(content) as string[]
      if (Array.isArray(actions) && actions.length > 0) {
        return { type: "actions", actions }
      }
    } catch {}
    return null
  },
}

const customParsers = new Map<string, BlockParser>()

export function registerBlockParser(name: string, parser: BlockParser) {
  customParsers.set(name, parser)
}

export function parseContentBlocks(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  let lastIndex = 0

  for (const match of raw.matchAll(BLOCK_REGEX)) {
    const before = raw.slice(lastIndex, match.index)
    if (before.trim()) {
      blocks.push({ type: "text", text: before.trim() })
    }

    const blockType = match[1]
    const content = match[2]

    const parser = builtinParsers[blockType] ?? customParsers.get(blockType)
    if (parser) {
      const block = parser(blockType, content)
      if (block) {
        blocks.push(block)
      } else {
        blocks.push({ type: "text", text: match[0] })
      }
    } else {
      try {
        const data = JSON.parse(content)
        blocks.push({ type: "custom", name: blockType, data })
      } catch {
        blocks.push({ type: "text", text: match[0] })
      }
    }

    lastIndex = match.index! + match[0].length
  }

  const remaining = raw.slice(lastIndex)
  if (remaining.trim()) {
    const incompleteBlock = remaining.match(/:::(\w+)/)
    if (incompleteBlock?.index !== undefined) {
      const before = remaining.slice(0, incompleteBlock.index)
      if (before.trim()) blocks.push({ type: "text", text: before.trim() })
    } else {
      blocks.push({ type: "text", text: remaining.trim() })
    }
  }

  return blocks
}
