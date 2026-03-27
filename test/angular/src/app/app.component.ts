import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core'
import { NgIf, NgFor } from '@angular/common'
import { ChatInputComponent } from './components/chat/chat-input.component'
import { ChatMessageComponent } from './components/chat/chat-message.component'

function cid() { return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }

function parseBlocks(raw: string): any[] {
  const blocks: any[] = []
  let last = 0
  const re = /:::(flow|actions)\n([\s\S]*?)\n:::/g
  for (const m of raw.matchAll(re)) {
    const before = raw.slice(last, m.index).trim()
    if (before) blocks.push({ type: 'text', text: before })
    try { if (m[1] === 'actions') { const a = JSON.parse(m[2]); if (Array.isArray(a)) blocks.push({ type: 'actions', actions: a }) } } catch {}
    last = m.index! + m[0].length
  }
  const rest = raw.slice(last).trim()
  if (rest) {
    const inc = rest.match(/:::(\w+)/)
    if (inc?.index !== undefined) { const b = rest.slice(0, inc.index).trim(); if (b) blocks.push({ type: 'text', text: b }) }
    else blocks.push({ type: 'text', text: rest })
  }
  return blocks
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, NgFor, ChatInputComponent, ChatMessageComponent],
  template: `
    <div class="container">
      <header>
        <div class="left">
          <span class="title">llm-chat-ui / Angular</span>
          <span class="badge">{{ mode }}</span>
        </div>
        <button class="clear" (click)="clear()">Clear</button>
      </header>
      <div #scroll class="messages">
        <chat-message *ngFor="let msg of messages" [message]="msg" [isStreaming]="streaming && msg.id === lastId"></chat-message>
        <div *ngIf="actions.length > 0" class="actions">
          <button *ngFor="let a of actions" class="action" (click)="inputValue = a">{{ a }}</button>
        </div>
      </div>
      <div class="bottom">
        <chat-input
          [value]="inputValue"
          [isLoading]="streaming"
          [enableFileUpload]="true"
          placeholder="Send a message..."
          (valueChange)="inputValue = $event"
          (send)="onSend($event)"
        ></chat-input>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 640px; margin: 0 auto; height: 100dvh; display: flex; flex-direction: column; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5; }
    header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e5e5e5; }
    .left { display: flex; align-items: center; gap: 12px; }
    .title { font-size: 14px; font-weight: 500; }
    .badge { font-size: 10px; color: #888; background: #f5f5f5; padding: 2px 8px; border-radius: 999px; }
    .clear { font-size: 12px; color: #888; cursor: pointer; background: none; border: none; }
    .clear:hover { color: #111; }
    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .action { cursor: pointer; border-radius: 999px; border: 1px solid #e5e5e5; padding: 4px 12px; font-size: 12px; color: #888; background: none; }
    .action:hover { background: #f5f5f5; color: #111; }
    .bottom { padding: 16px; }
    *::-webkit-scrollbar { width: 4px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 4px; }
  `],
})
export class AppComponent implements AfterViewChecked {
  messages: any[] = []
  streaming = false
  inputValue = ''
  mode = 'checking...'
  @ViewChild('scroll') scrollEl!: ElementRef<HTMLElement>

  get lastId() { return this.messages[this.messages.length - 1]?.id }
  get actions(): string[] {
    if (this.streaming || !this.messages.length) return []
    const last = [...this.messages].reverse().find((m: any) => m.role === 'assistant')
    const block = last?.blocks?.find((b: any) => b.type === 'actions')
    return block?.actions || []
  }

  constructor() {
    const w = 'Hello! Ask me anything. Try:\n\n- "What\'s the weather in Tokyo?"\n- "Calculate 42 * 17 + 3"\n- "Search for TypeScript generics"'
    this.messages = [{ id: cid(), role: 'assistant', blocks: parseBlocks(w), rawContent: w, reasoningSteps: [], timestamp: Date.now() }]
    fetch('/api/chat').then(r => r.json()).then(d => this.mode = d.mode).catch(() => this.mode = 'mock')
  }

  ngAfterViewChecked() { const el = this.scrollEl?.nativeElement; if (el) el.scrollTop = el.scrollHeight }
  clear() { this.messages = [] }

  async onSend(ev: { message: string; files?: File[] }) {
    if (this.streaming) return
    this.inputValue = ''
    const files = ev.files?.length ? ev.files.map((f: File) => ({ name: f.name, type: f.type })) : undefined
    const uMsg = { id: cid(), role: 'user', blocks: [{ type: 'text', text: ev.message }], rawContent: ev.message, reasoningSteps: [], files, timestamp: Date.now() }
    const aId = cid()
    const aMsg = { id: aId, role: 'assistant', blocks: [] as any[], rawContent: '', reasoningSteps: [] as any[], timestamp: Date.now() }
    this.messages = [...this.messages, uMsg, aMsg]
    this.streaming = true

    const history = this.messages.filter((m: any) => m.role === 'user' || m.role === 'assistant').map((m: any) => ({ role: m.role, content: m.rawContent })).slice(-10)
    let rId: string | null = null, rText = '', sc = 0
    const tMap: Record<string, string> = {}

    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: ev.message, history }) })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let e: any; try { e = JSON.parse(line.slice(6)) } catch { continue }

          this.messages = this.messages.map((m: any) => {
            if (m.id !== aId) return m
            const msg = { ...m, reasoningSteps: [...m.reasoningSteps] }
            switch (e.type) {
              case 'reasoning': {
                rText += e.delta; const h = rText.match(/\*\*(.+?)\*\*/)
                const ex = msg.reasoningSteps.find((s: any) => s.id === rId)
                if (ex) { const i = msg.reasoningSteps.indexOf(ex); msg.reasoningSteps[i] = { ...ex, title: h?.[1] ?? 'Thinking...', content: rText } }
                else { sc++; rId = `r-${aId}-${sc}`; msg.reasoningSteps.push({ id: rId, type: 'thinking', title: h?.[1] ?? 'Thinking...', content: rText, status: 'running' }) }
                break
              }
              case 'tool_start': {
                if (rId) { const s = msg.reasoningSteps.find((s: any) => s.id === rId); if (s) msg.reasoningSteps[msg.reasoningSteps.indexOf(s)] = { ...s, status: 'success' }; rId = null; rText = '' }
                sc++; const sid = `${e.id}-${aId}-${sc}`; tMap[e.id] = sid
                msg.reasoningSteps.push({ id: sid, type: 'tool', title: e.name, toolName: e.name, icon: e.icon, status: 'running' })
                break
              }
              case 'tool_done': {
                const sid = tMap[e.id] ?? e.id; const s = msg.reasoningSteps.find((s: any) => s.id === sid)
                if (s) msg.reasoningSteps[msg.reasoningSteps.indexOf(s)] = { ...s, status: 'success', resultCount: e.count, content: e.summary }
                break
              }
              case 'text_delta': {
                if (rId) { const s = msg.reasoningSteps.find((s: any) => s.id === rId); if (s) msg.reasoningSteps[msg.reasoningSteps.indexOf(s)] = { ...s, status: 'success' }; rId = null }
                msg.rawContent += e.delta; msg.blocks = parseBlocks(msg.rawContent)
                break
              }
              case 'replace_text': { msg.rawContent = e.text; msg.blocks = parseBlocks(e.text); break }
              case 'error': { msg.rawContent += `\n\nError: ${e.message}`; msg.blocks = parseBlocks(msg.rawContent); this.streaming = false; break }
              case 'done': { this.streaming = false; break }
            }
            return msg
          })
        }
      }
    } catch (err: any) {
      this.messages = this.messages.map((m: any) => {
        if (m.id !== aId) return m
        const rc = m.rawContent + `\n\nError: ${err.message || err}`
        return { ...m, rawContent: rc, blocks: parseBlocks(rc) }
      })
    }
    this.streaming = false
  }
}
