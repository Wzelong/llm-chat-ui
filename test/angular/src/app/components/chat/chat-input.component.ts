import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core'
import { NgIf, NgFor } from '@angular/common'
import { UploadedFileChipComponent } from './uploaded-file-chip.component'

@Component({
  selector: 'chat-input',
  standalone: true,
  imports: [NgIf, NgFor, UploadedFileChipComponent],
  template: `
    <div class="box" [class.expanded]="isExpanded">
      <div *ngIf="files.length > 0" class="file-row">
        <uploaded-file-chip *ngFor="let f of files; let i = index" [file]="f" (remove)="removeFile(i)"></uploaded-file-chip>
      </div>
      <div class="row">
        <button *ngIf="enableFileUpload" class="attach" [disabled]="isLoading" (click)="fileEl.click()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <input #fileEl type="file" multiple (change)="onFiles($event)" style="display:none" />
        <textarea
          #ta
          [value]="value"
          (input)="onInput($event)"
          (keydown)="onKey($event)"
          [placeholder]="placeholder"
          [disabled]="isLoading"
          rows="1"
          class="ta"
        ></textarea>
        <button class="send" [class.active]="canSend" [disabled]="!canSend" (click)="doSend()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .box { position: relative; display: flex; flex-direction: column; gap: 4px; border: 1px solid #e5e5e5; background: #fff; padding: 8px; border-radius: 9999px; transition: border-color 0.15s; }
    .box.expanded { border-radius: 16px; }
    .box:focus-within { border-color: rgba(0,0,0,0.4); }
    .file-row { display: flex; gap: 8px; overflow-x: auto; padding: 4px 4px 4px; }
    .row { display: flex; align-items: flex-end; }
    .attach { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: none; background: none; color: #888; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
    .attach:hover { color: #111; }
    .attach:disabled { opacity: 0.5; cursor: not-allowed; }
    .ta { flex: 1; resize: none; border: none; background: transparent; padding: 4px 8px; font-size: 14px; line-height: 20px; outline: none; font-family: inherit; min-height: 28px; max-height: 120px; margin: 0; }
    .ta::placeholder { color: #888; }
    .ta:disabled { opacity: 0.5; cursor: not-allowed; }
    .send { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: none; background: #e5e5e5; color: #888; cursor: not-allowed; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; padding: 0; }
    .send.active { background: #111; color: #fff; cursor: pointer; }
    .send.active:hover { opacity: 0.8; }
  `],
})
export class ChatInputComponent implements AfterViewInit {
  @Input() value = ''
  @Input() isLoading = false
  @Input() placeholder = 'Send a message...'
  @Input() enableFileUpload = false
  @Output() valueChange = new EventEmitter<string>()
  @Output() send = new EventEmitter<{ message: string; files?: File[] }>()
  @ViewChild('ta') ta!: ElementRef<HTMLTextAreaElement>

  files: File[] = []
  isMultiline = false

  get isExpanded() { return this.isMultiline || this.files.length > 0 }
  get canSend() { return (this.value.trim() || this.files.length > 0) && !this.isLoading }

  ngAfterViewInit() { this.resize() }

  resize() {
    const el = this.ta?.nativeElement
    if (!el) return
    el.style.height = '0'
    const scrollHeight = Math.min(el.scrollHeight, 120)
    el.style.height = scrollHeight + 'px'
    el.style.overflowY = el.scrollHeight > 120 ? 'auto' : 'hidden'
    const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20
    this.isMultiline = el.scrollHeight > lineHeight * 1.5
  }

  onInput(e: Event) {
    this.valueChange.emit((e.target as HTMLTextAreaElement).value)
    setTimeout(() => this.resize())
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.doSend() }
  }

  onFiles(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files) this.files = [...this.files, ...Array.from(input.files)]
    input.value = ''
  }

  removeFile(i: number) { this.files = this.files.filter((_, idx) => idx !== i) }

  doSend() {
    const msg = this.value.trim()
    if ((!msg && !this.files.length) || this.isLoading) return
    const f = this.files.length ? [...this.files] : undefined
    this.files = []
    this.isMultiline = false
    this.valueChange.emit('')
    if (this.ta?.nativeElement) this.ta.nativeElement.style.height = 'auto'
    this.send.emit({ message: msg, files: f })
  }
}
