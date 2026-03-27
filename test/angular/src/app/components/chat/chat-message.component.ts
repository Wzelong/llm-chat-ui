import { Component, Input } from '@angular/core'
import { NgIf, NgFor } from '@angular/common'
import { ReasoningStepsComponent } from './reasoning-steps.component'
import { FileChipComponent } from './file-chip.component'
import { marked } from 'marked'

@Component({
  selector: 'chat-message',
  standalone: true,
  imports: [NgIf, NgFor, ReasoningStepsComponent, FileChipComponent],
  template: `
    <div class="row" [class.user]="isUser" [class.assistant]="!isUser">
      <div *ngIf="isUser && message?.files?.length" class="files">
        <file-chip *ngFor="let f of message.files" [file]="f"></file-chip>
      </div>
      <div *ngIf="!isUser || userText" class="bubble" [class.user-bubble]="isUser" [class.assistant-bubble]="!isUser">
        <ng-container *ngIf="isUser">{{ userText }}</ng-container>
        <ng-container *ngIf="!isUser">
          <reasoning-steps *ngIf="message?.reasoningSteps?.length" [steps]="message.reasoningSteps"></reasoning-steps>
          <div *ngFor="let block of textBlocks" class="md" [innerHTML]="renderMd(block.text)"></div>
          <div *ngIf="isStreaming && !message?.blocks?.length && !message?.reasoningSteps?.length" class="loading"><div class="spinner"></div></div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .row { width: 100%; display: flex; flex-direction: column; }
    .row.user { align-items: flex-end; }
    .row.assistant { align-items: flex-start; }
    .files { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0; }
    .bubble { border-radius: 16px; padding: 8px 0; font-size: 14px; max-width: 88%; }
    .user-bubble { background: #f0f0f0; padding: 8px 14px; }
    .assistant-bubble { width: 88%; padding: 8px 4px; }
    .md { word-break: break-word; line-height: 1.6; }
    :host ::ng-deep .md p { margin: 4px 0; }
    :host ::ng-deep .md ul, :host ::ng-deep .md ol { margin: 4px 0; padding-left: 20px; }
    :host ::ng-deep .md code { background: #f0f0f0; padding: 1px 4px; border-radius: 4px; font-size: 13px; }
    :host ::ng-deep .md pre { background: #f0f0f0; padding: 12px; border-radius: 8px; overflow-x: auto; }
    :host ::ng-deep .md pre code { background: none; padding: 0; }
    :host ::ng-deep .md strong { font-weight: 600; }
    .loading { display: flex; align-items: center; height: 32px; }
    .spinner { width: 14px; height: 14px; border: 2px solid #e5e5e5; border-top-color: #888; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ChatMessageComponent {
  @Input() message: any = {}
  @Input() isStreaming = false
  get isUser() { return this.message?.role === 'user' }
  get userText() { const b = this.message?.blocks?.[0]; return b?.type === 'text' ? b.text : '' }
  get textBlocks() { return (this.message?.blocks || []).filter((b: any) => b.type === 'text') }
  renderMd(text: string): string { return marked.parse(text, { async: false }) as string }
}
