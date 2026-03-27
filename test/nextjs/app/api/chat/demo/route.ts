function sse(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function* streamChars(text: string, msPerChar: number) {
  for (const char of text) {
    yield char
    await sleep(msPerChar)
  }
}

export async function POST() {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) =>
        controller.enqueue(new TextEncoder().encode(sse(data)))

      // --- Reasoning ---
      const reasoning =
        "**Examining the uploaded design**\n" +
        "I can see a dashboard UI with sidebar navigation, data cards, and charts. " +
        "Let me analyze the layout, check accessibility, and reference design best practices."

      for await (const char of streamChars(reasoning, 12)) {
        send({ type: "reasoning", delta: char })
      }
      await sleep(800)

      // --- Tool 1: vision_analyze (image processing is slow) ---
      send({
        type: "tool_start",
        id: "t1",
        name: "vision_analyze",
        icon: "eye",
        args: { image: "dashboard-mockup.png" },
      })
      await sleep(3000)
      send({
        type: "tool_done",
        id: "t1",
        count: 8,
        summary:
          "elements: sidebar nav, header, search bar, 3 chart cards, data table, filter row\n" +
          "colors: #1a1a2e, #16213e, #0f3460, #e94560",
      })
      await sleep(400)

      // --- Tool 2: accessibility_audit ---
      send({
        type: "tool_start",
        id: "t2",
        name: "accessibility_audit",
        icon: "shield",
        args: { scope: "contrast, touch targets, labels" },
      })
      await sleep(1800)
      send({
        type: "tool_done",
        id: "t2",
        count: 3,
        summary:
          "fail: secondary text contrast 3.2:1 (needs 4.5:1)\n" +
          "fail: chart cards missing aria-labels\n" +
          "warn: filter buttons 36px (recommend 44px)",
      })
      await sleep(400)

      // --- Tool 3: design_lookup (db lookup is fast) ---
      send({
        type: "tool_start",
        id: "t3",
        name: "design_lookup",
        icon: "book",
        args: { pattern: "dashboard layout", source: "design-systems" },
      })
      await sleep(1000)
      send({
        type: "tool_done",
        id: "t3",
        count: 5,
        summary:
          "matched: sidebar+content grid\n" +
          "ref: Material Design dashboard guidelines\n" +
          "ref: Nielsen Norman Group data density study",
      })
      await sleep(500)

      // --- Streaming response ---
      const response =
        "## Design Analysis\n\n" +
        "**Layout**: Sidebar + content grid -- well-structured hierarchy with clear visual zones.\n\n" +
        "**Color Palette**: Dark theme with 4 primary colors. The accent (`#e94560`) provides good focal points.\n\n" +
        "### Issues Found\n\n" +
        "| Issue | Severity | Detail |\n" +
        "|-------|----------|--------|\n" +
        "| Text contrast | Fail | 3.2:1 ratio (needs 4.5:1) |\n" +
        "| Missing aria-labels | Fail | Chart cards unreadable by screen readers |\n" +
        "| Touch targets | Warn | Filter buttons 36px (recommend 44px) |\n\n" +
        "### Recommendations\n\n" +
        "1. **Spacing** -- Add `12px` gap between chart cards\n" +
        "2. **Filters** -- Move controls above the data table into a toolbar row\n" +
        "3. **Responsive** -- Collapsible sidebar for viewports under `1024px`\n" +
        "4. **Accessibility** -- Add `alt` text to all chart images\n\n" +
        "Contrast fix example:\n\n" +
        "```css\n.secondary-text {\n  color: #b0b0b0; /* was #999 */\n}\n```\n"

      for await (const char of streamChars(response, 4)) {
        send({ type: "text_delta", delta: char })
      }

      // --- Actions (send as one chunk so parser handles it atomically) ---
      send({ type: "text_delta", delta: '\n\n:::actions\n["Generate CSS fixes for contrast issues", "Check mobile responsiveness", "Redesign the chart cards"]\n:::' })

      send({ type: "done" })
      controller.close()
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
