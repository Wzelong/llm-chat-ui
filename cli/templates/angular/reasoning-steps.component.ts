import { Component, input, signal } from "@angular/core"
import type { ReasoningStep } from "llm-chat-ui"

@Component({
  selector: "reasoning-steps",
  standalone: true,
  template: `
    @if (steps().length > 0) {
      <div class="reasoning-steps">
        <button class="toggle-btn" (click)="showAll.set(!showAll())">
          <span class="chevron" [class.collapsed]="!showAll()">v</span>
          {{ showAll() ? 'Hide steps' : 'Show steps' }}
        </button>
        @if (showAll()) {
          <div>
            @for (step of steps(); track step.id) {
              <div class="step-row">
                <div class="step-icon">
                  @if (step.type === 'thinking') {
                    <div class="dot"></div>
                  } @else {
                    @if (step.status === 'running') {
                      <div class="spinner"></div>
                    } @else {
                      <span class="tool-icon">T</span>
                    }
                  }
                </div>
                <button class="step-content" [class.clickable]="!!step.content" (click)="step.content ? toggleStep(step.id) : null">
                  <span class="step-title">{{ step.title }}</span>
                  @if (step.type === 'tool' && step.resultCount && step.resultCount > 0 && step.status === 'success') {
                    <span class="result-count">{{ step.resultCount }} results</span>
                  }
                  <span class="expand-icon" [class.rotated]="expandedSteps().has(step.id)" [class.invisible]="!step.content">v</span>
                </button>
                @if (expandedSteps().has(step.id) && step.content) {
                  <div class="step-detail">
                    @for (line of step.content.split('\\n'); track $index) {
                      @if (line.trim()) {
                        <div class="detail-line">{{ line }}</div>
                      }
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .reasoning-steps { margin-bottom: 8px; }
    .toggle-btn { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #888; cursor: pointer; background: none; border: none; margin-bottom: 8px; padding: 0; }
    .chevron { transition: transform 0.2s; display: inline-block; font-size: 12px; }
    .chevron.collapsed { transform: rotate(-90deg); }
    .step-row { position: relative; display: flex; flex-wrap: wrap; align-items: flex-start; }
    .step-icon { width: 16px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #888; }
    .spinner { width: 14px; height: 14px; border: 2px solid #e5e5e5; border-top-color: #888; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .tool-icon { font-size: 12px; color: #888; }
    .step-content { display: flex; align-items: center; gap: 8px; height: 32px; flex: 1; background: none; border: none; text-align: left; min-width: 0; padding: 0 0 0 8px; }
    .step-content.clickable { cursor: pointer; }
    .step-title { flex: 1; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .result-count { font-size: 12px; color: rgba(128,128,128,0.5); flex-shrink: 0; width: 64px; text-align: right; }
    .expand-icon { flex-shrink: 0; font-size: 12px; color: #888; transition: transform 0.2s; display: inline-block; }
    .expand-icon.rotated { transform: rotate(180deg); }
    .expand-icon.invisible { visibility: hidden; }
    .step-detail { width: 100%; margin: 4px 0 4px 24px; max-height: 192px; overflow-y: auto; }
    .detail-line { font-size: 11px; color: rgba(128,128,128,0.7); font-family: monospace; overflow-wrap: break-word; }
  `],
})
export class ReasoningStepsComponent {
  steps = input.required<ReasoningStep[]>()
  showAll = signal(true)
  expandedSteps = signal(new Set<string>())

  toggleStep(id: string) {
    const next = new Set(this.expandedSteps())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.expandedSteps.set(next)
  }
}
