import { Component, Input } from '@angular/core'
import { NgIf, NgFor } from '@angular/common'

@Component({
  selector: 'reasoning-steps',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <div *ngIf="steps && steps.length > 0" class="reasoning">
      <button class="toggle" (click)="showAll = !showAll">
        <svg class="chevron" [class.collapsed]="!showAll" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
        {{ showAll ? 'Hide steps' : 'Show steps' }}
      </button>
      <div *ngIf="showAll">
        <div *ngFor="let step of steps" class="step-row">
          <div class="step-icon">
            <div *ngIf="step.type === 'thinking'" class="dot"></div>
            <svg *ngIf="step.type === 'tool'" class="tool-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <button class="step-btn" [class.clickable]="!!step.content" (click)="step.content && toggle(step.id)">
            <span class="title" [class.pulse]="step.status === 'running'">{{ step.title }}</span>
            <span *ngIf="step.resultCount && step.resultCount > 0 && step.status === 'success'" class="count">{{ step.resultCount }} results</span>
            <svg class="arrow" [class.open]="expanded.has(step.id)" [class.hide]="!step.content" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div *ngIf="expanded.has(step.id) && step.content" class="detail">
            <div *ngFor="let line of lines(step.content)" class="line">{{ line }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reasoning { margin-bottom: 8px; }
    .toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #888; cursor: pointer; background: none; border: none; margin-bottom: 8px; padding: 0; }
    .chevron { transition: transform 0.2s; color: #888; }
    .chevron.collapsed { transform: rotate(-90deg); }
    .step-row { position: relative; }
    .step-icon { position: absolute; left: 0; top: 0; width: 16px; height: 32px; display: flex; align-items: center; justify-content: center; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #888; }
    .pulse { animation: breathe 2.5s ease-in-out infinite; }
    @keyframes breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .tool-icon { color: #888; }
    .step-btn { display: flex; align-items: center; gap: 8px; height: 32px; margin-left: 24px; width: calc(100% - 24px); background: none; border: none; text-align: left; padding: 0; }
    .step-btn.clickable { cursor: pointer; }
    .title { flex: 1; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .count { font-size: 12px; color: rgba(128,128,128,0.5); flex-shrink: 0; }
    .arrow { color: #888; transition: transform 0.2s; flex-shrink: 0; }
    .arrow.open { transform: rotate(180deg); }
    .arrow.hide { visibility: hidden; }
    .detail { margin: 4px 0 4px 24px; max-height: 192px; overflow-y: auto; }
    .line { font-size: 11px; color: rgba(128,128,128,0.7); font-family: monospace; word-break: break-word; }
  `],
})
export class ReasoningStepsComponent {
  @Input() steps: any[] = []
  showAll = true
  expanded = new Set<string>()
  toggle(id: string) { if (this.expanded.has(id)) this.expanded.delete(id); else this.expanded.add(id) }
  lines(content: string): string[] { return content.split('\n').filter((l: string) => l.trim()) }
}
