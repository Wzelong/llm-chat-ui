import fs from "node:fs"
import path from "node:path"
import prompts from "prompts"

const TEMPLATES_DIR = path.resolve(
  new URL(".", import.meta.url).pathname,
  "..",
  "cli",
  "templates",
)

type Framework = "react" | "vue" | "angular"

const COMPONENTS: Record<Framework, { name: string; file: string; description: string }[]> = {
  react: [
    { name: "chat-input", file: "chat-input.tsx", description: "Textarea with send button and optional file upload" },
    { name: "chat-message", file: "chat-message.tsx", description: "Message renderer with markdown and file chips" },
    { name: "reasoning-steps", file: "reasoning-steps.tsx", description: "Thinking and tool step display" },
    { name: "uploaded-file-chip", file: "uploaded-file-chip.tsx", description: "File chip for input area (removable)" },
    { name: "file-chip", file: "file-chip.tsx", description: "File chip for sent messages (read-only)" },
  ],
  vue: [
    { name: "ChatInput", file: "ChatInput.vue", description: "Textarea with send button and optional file upload" },
    { name: "ChatMessage", file: "ChatMessage.vue", description: "Message renderer with markdown and file chips" },
    { name: "ReasoningSteps", file: "ReasoningSteps.vue", description: "Thinking and tool step display" },
    { name: "UploadedFileChip", file: "UploadedFileChip.vue", description: "File chip for input area (removable)" },
    { name: "FileChip", file: "FileChip.vue", description: "File chip for sent messages (read-only)" },
  ],
  angular: [
    { name: "chat-input", file: "chat-input.component.ts", description: "Textarea with send button and optional file upload" },
    { name: "chat-message", file: "chat-message.component.ts", description: "Message renderer with markdown and file chips" },
    { name: "reasoning-steps", file: "reasoning-steps.component.ts", description: "Thinking and tool step display" },
    { name: "uploaded-file-chip", file: "uploaded-file-chip.component.ts", description: "File chip for input area (removable)" },
    { name: "file-chip", file: "file-chip.component.ts", description: "File chip for sent messages (read-only)" },
  ],
}

const DEPS: Record<Framework, string[]> = {
  react: ["react-markdown", "remark-gfm", "lucide-react", "clsx", "tailwind-merge"],
  vue: ["lucide-vue-next", "markdown-it"],
  angular: ["lucide-angular", "marked"],
}

function detectFramework(): Framework {
  const args = process.argv.slice(3)
  if (args.includes("--vue")) return "vue"
  if (args.includes("--angular")) return "angular"
  return "react"
}

async function main() {
  const command = process.argv[2]

  if (command !== "add") {
    console.log("Usage: llm-chat-ui add [--vue | --angular]")
    console.log("Copies reference UI components into your project.")
    console.log("\nFrameworks:")
    console.log("  (default)    React (TSX + Tailwind)")
    console.log("  --vue        Vue 3 (SFC + scoped CSS)")
    console.log("  --angular    Angular (standalone components)")
    process.exit(0)
  }

  const framework = detectFramework()
  const components = COMPONENTS[framework]
  const deps = DEPS[framework]

  console.log(`Framework: ${framework}\n`)

  const { selected } = await prompts({
    type: "multiselect",
    name: "selected",
    message: "Which components?",
    choices: components.map((c) => ({
      title: `${c.name} — ${c.description}`,
      value: c.file,
      selected: true,
    })),
  })

  if (!selected || selected.length === 0) {
    console.log("No components selected.")
    process.exit(0)
  }

  const defaultDest = framework === "vue"
    ? "./src/components/chat"
    : framework === "angular"
      ? "./src/app/components/chat"
      : "./src/components/chat"

  const { destination } = await prompts({
    type: "text",
    name: "destination",
    message: "Destination directory?",
    initial: defaultDest,
  })

  if (!destination) process.exit(0)

  const destPath = path.resolve(process.cwd(), destination)
  fs.mkdirSync(destPath, { recursive: true })

  const subdir = framework === "react" ? "" : framework

  for (const file of selected) {
    const candidates = [
      path.join(TEMPLATES_DIR, subdir, file),
      path.resolve(new URL(".", import.meta.url).pathname, "..", "..", "cli", "templates", subdir, file),
    ]

    let copied = false
    for (const src of candidates) {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(destPath, file))
        console.log(`  + ${file}`)
        copied = true
        break
      }
    }
    if (!copied) console.log(`  ! ${file} not found, skipping`)
  }

  console.log(`\nComponents added to ${destination}`)
  console.log(`\nRequired dependencies:`)
  console.log(`  npm install ${deps.join(" ")}`)

  if (framework === "vue") {
    console.log(`\nImport the composable:`)
    console.log(`  import { useChat } from "llm-chat-ui/vue"`)
  } else if (framework === "angular") {
    console.log(`\nImport adapters from subpaths to avoid React/Zustand bundling:`)
    console.log(`  import { createSSEAdapter } from "llm-chat-ui/adapters/sse"`)
    console.log(`  import { parseContentBlocks } from "llm-chat-ui/parser"`)
    console.log(`  import type { Message } from "llm-chat-ui/types"`)
  }
}

main().catch(console.error)
