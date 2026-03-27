import { Component, input, computed } from "@angular/core"
import { ReasoningStepsComponent } from "./reasoning-steps.component"
import { FileChipComponent } from "./file-chip.component"
import type { Message, ContentBlock } from "llm-chat-ui"
import { marked } from "marked"

@Component({
  selector: "chat-message",
  standalone: true,
  imports: [ReasoningStepsComponent, FileChipComponent],
  template: `
    <div class="message-row" [class.user]="isUser()" [class.assistant]="!isUser()">
      @if (isUser() && hasFiles()) {
        <div class="file-row">
          @for (file of message().files!; track $index) {
            <file-chip [file]="file" />
          }
        </div>
      }
      <div class="bubble" [class.user-bubble]="isUser()" [class.assistant-bubble]="!isUser()">
        @if (isUser()) {
          {{ userText() }}
        } @else {
          @if (message().reasoningSteps.length > 0) {
            <reasoning-steps [steps]="message().reasoningSteps" />
          }
          @for (block of textBlocks(); track $index) {
            <div class="markdown-content" [innerHTML]="renderMarkdown(block.text)"></div>
          }
          @if (showSpinner()) {
            <div class="spinner-row"><div class="spinner"></div></div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .message-row { width: 100%; display: flex; flex-direction: column; }
    .message-row.user { align-items: flex-end; }
    .message-row.assistant { align-items: flex-start; }
    .file-row { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0; }
    .bubble { border-radius: 16px; padding: 8px 0; font-size: 14px; max-width: 88%; }
    .user-bubble { background: #f0f0f0; padding: 8px 14px; }
    .assistant-bubble { width: 88%; padding: 8px 4px; }
    .markdown-content { word-break: break-word; white-space: normal; line-height: 1.6; }
    :host ::ng-deep .markdown-content p { margin: 4px 0; }
    :host ::ng-deep .markdown-content h1, :host ::ng-deep .markdown-content h2, :host ::ng-deep .markdown-content h3 { margin: 8px 0; }
    :host ::ng-deep .markdown-content ul, :host ::ng-deep .markdown-content ol { margin: 4px 0; padding-left: 20px; }
    :host ::ng-deep .markdown-content code { background: #f0f0f0; padding: 1px 4px; border-radius: 4px; font-size: 13px; }
    :host ::ng-deep .markdown-content pre { background: #f0f0f0; padding: 12px; border-radius: 8px; overflow-x: auto; }
    :host ::ng-deep .markdown-content pre code { background: none; padding: 0; }
    :host ::ng-deep .markdown-content strong { font-weight: 600; }
    .spinner-row { display: flex; align-items: center; height: 32px; }
    .spinner { width: 14px; height: 14px; border: 2px solid #e5e5e5; border-top-color: #888; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ChatMessageComponent {
  message = input.required<Message>()
  isStreamingInput = input(false, { alias: "isStreaming" })

  isUser = computed(() => this.message().role === "user")
  userText = computed(() => {
    const block = this.message().blocks[0]
    return block?.type === "text" ? block.text : ""
  })
  hasFiles = computed(() => (this.message().files?.length ?? 0) > 0)
  textBlocks = computed(() =>
    this.message().blocks.filter((b): b is { type: "text"; text: string } => b.type === "text"),
  )
  showSpinner = computed(
    () => this.isStreamingInput() && this.message().blocks.length === 0 && this.message().reasoningSteps.length === 0,
  )

  renderMarkdown(text: string): string {
    return marked.parse(text, { async: false }) as string
  }
}
