import { NextRequest } from "next/server"
import OpenAI from "openai"

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

const TOOLS: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "get_weather",
    description: "Get current weather for a city",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
      },
      required: ["city"],
    },
  },
  {
    type: "function",
    name: "calculate",
    description: "Evaluate a math expression",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression to evaluate" },
      },
      required: ["expression"],
    },
  },
  {
    type: "function",
    name: "search_knowledge",
    description: "Search a knowledge base for information",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results" },
      },
      required: ["query"],
    },
  },
]

function executeTool(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "get_weather": {
      const city = args.city as string
      const temp = Math.floor(Math.random() * 30 + 5)
      const conditions = ["sunny", "cloudy", "rainy", "partly cloudy", "windy"]
      const cond = conditions[Math.floor(Math.random() * conditions.length)]
      return JSON.stringify({ city, temperature: `${temp}C`, condition: cond, humidity: `${Math.floor(Math.random() * 60 + 30)}%` })
    }
    case "calculate": {
      const expr = args.expression as string
      try {
        const result = Function(`"use strict"; return (${expr})`)()
        return JSON.stringify({ expression: expr, result })
      } catch {
        return JSON.stringify({ expression: expr, error: "Invalid expression" })
      }
    }
    case "search_knowledge": {
      const query = args.query as string
      const limit = (args.limit as number) ?? 3
      const results = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${query}"`,
        snippet: `This is a simulated knowledge base result about ${query}. Contains relevant information for the query.`,
        relevance: +(Math.random() * 0.4 + 0.6).toFixed(2),
      }))
      return JSON.stringify({ query, count: results.length, results })
    }
    default:
      return JSON.stringify({ error: "Unknown tool" })
  }
}

const SYSTEM_PROMPT = `You are a helpful assistant for testing an LLM chat UI library.
You have access to tools: get_weather, calculate, and search_knowledge.
Use them when relevant to the user's question. Feel free to use multiple tools in one response.
Keep responses concise but informative. Use markdown formatting.

At the end of every response, include 2-3 suggested follow-up questions in this exact format:

:::actions
["suggested question 1", "suggested question 2", "suggested question 3"]
:::`

const ICON_MAP: Record<string, string> = {
  get_weather: "cloud",
  calculate: "calculator",
  search_knowledge: "search",
}

async function streamWithOpenAI(
  message: string,
  history: { role: string; content: string }[],
  controller: ReadableStreamDefaultController,
) {
  const send = (data: Record<string, unknown>) =>
    controller.enqueue(new TextEncoder().encode(sseEvent(data)))

  const openai = new OpenAI()

  const messages: OpenAI.Responses.ResponseInput = []
  for (const h of history) {
    messages.push({ role: h.role as "user" | "assistant", content: h.content })
  }
  messages.push({ role: "user", content: message })

  let previousResponseId: string | null = null
  let toolOutputs: OpenAI.Responses.ResponseInputItem[] = []

  while (true) {
    const createParams: Record<string, unknown> = {
      model: "gpt-5.4-mini",
      instructions: SYSTEM_PROMPT,
      tools: TOOLS,
      stream: true,
      reasoning: { effort: "medium", summary: "auto" },
    }

    if (previousResponseId) {
      createParams.previous_response_id = previousResponseId
      createParams.input = toolOutputs
    } else {
      createParams.input = messages
    }

    const response = await openai.responses.create(createParams as Parameters<typeof openai.responses.create>[0])

    let responseId: string | null = null
    let hasToolCall = false
    const pendingCalls: Record<string, { name: string; callId: string }> = {}
    let currentArgs = ""

    toolOutputs = []

    for await (const event of response) {
      if (event.type === "response.created") {
        responseId = event.response.id
      }

      if (event.type === "response.reasoning_summary_text.delta") {
        send({ type: "reasoning", delta: event.delta })
      }

      if (event.type === "response.output_text.delta") {
        send({ type: "text_delta", delta: event.delta })
      }

      if (event.type === "response.output_item.added") {
        const item = event.item
        if (item.type === "function_call") {
          pendingCalls[item.id] = {
            name: item.name ?? "",
            callId: item.call_id ?? item.id,
          }
          currentArgs = ""
        }
      }

      if (event.type === "response.function_call_arguments.delta") {
        currentArgs += event.delta
      }

      if (event.type === "response.function_call_arguments.done") {
        hasToolCall = true
        const itemId = event.item_id
        const toolInfo = pendingCalls[itemId] ?? { name: "", callId: itemId }
        const toolName = toolInfo.name
        const callId = toolInfo.callId

        let parsedArgs: Record<string, unknown> = {}
        try { parsedArgs = JSON.parse(event.arguments) } catch {}

        const tid = `tool-${Date.now()}`
        send({ type: "tool_start", id: tid, name: toolName, icon: ICON_MAP[toolName], args: parsedArgs })

        const result = executeTool(toolName, parsedArgs)
        const parsed = JSON.parse(result)
        const count = parsed.count ?? parsed.results?.length ?? 1
        const summary = Object.entries(parsed)
          .filter(([k]) => k !== "results")
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")

        send({ type: "tool_done", id: tid, count, summary })

        toolOutputs.push({
          type: "function_call_output",
          call_id: callId,
          output: result,
        })
      }
    }

    previousResponseId = responseId

    if (!hasToolCall) {
      break
    }
  }

  send({ type: "done" })
  controller.close()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function streamMock(
  message: string,
  controller: ReadableStreamDefaultController,
) {
  const send = (data: Record<string, unknown>) =>
    controller.enqueue(new TextEncoder().encode(sseEvent(data)))

  send({ type: "reasoning", delta: "**Analyzing the question**\n" })
  await sleep(300)
  send({ type: "reasoning", delta: `The user asked: ${message}\n` })
  await sleep(200)

  const toolNames = ["web_search", "code_analysis", "document_lookup"]
  const toolName = toolNames[Math.floor(Math.random() * toolNames.length)]
  const toolId = `tool-${Math.floor(Math.random() * 9000 + 1000)}`
  send({ type: "tool_start", id: toolId, name: toolName, args: { query: message } })
  await sleep(800)
  const resultCount = Math.floor(Math.random() * 10 + 3)
  send({ type: "tool_done", id: toolId, count: resultCount, summary: `Found ${resultCount} relevant results` })
  await sleep(200)

  const fullText =
    `Here's what I found after analyzing your request.\n\nYou said: **${message}**\n\n` +
    `Key points:\n\n` +
    `- The ${toolName} returned ${resultCount} results\n` +
    `- All results have been analyzed\n` +
    `- The response is streamed in real-time\n`

  for (const char of fullText) {
    send({ type: "text_delta", delta: char })
    await sleep(10)
  }

  send({ type: "done" })
  controller.close()
}

export async function GET() {
  const hasKey = !!process.env.OPENAI_API_KEY
  return Response.json({ mode: hasKey ? "openai (gpt-5.4-mini)" : "mock" })
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json()
  const hasKey = !!process.env.OPENAI_API_KEY

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (hasKey) {
          await streamWithOpenAI(message, history, controller)
        } else {
          await streamMock(message, controller)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        controller.enqueue(new TextEncoder().encode(sseEvent({ type: "error", message: msg })))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
