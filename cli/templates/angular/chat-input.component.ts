import { Component, input, output, signal, computed, ViewChild, ElementRef, AfterViewInit } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { UploadedFileChipComponent } from "./uploaded-file-chip.component"

@Component({
  selector: "chat-input",
  standalone: true,
  imports: [FormsModule, UploadedFileChipComponent],
  template: `
    <div class="chat-input" [class.expanded]="isExpanded()">
      @if (hasFiles()) {
        <div class="file-row">
          @for (file of files(); track $index) {
            <uploaded-file-chip [file]="file" (remove)="removeFile($index)" />
          }
        </div>
      }
      <div class="input-row">
        @if (enableFileUpload()) {
          <input #fileInput type="file" multiple (change)="onFileChange($event)" class="hidden" />
          <button class="attach-btn" [disabled]="isLoading()" (click)="fileInput.click()">
            <span>+</span>
          </button>
        }
        <textarea
          #textareaEl
          [value]="value()"
          (input)="onInput($event)"
          (keydown)="onKeyDown($event)"
          [placeholder]="placeholder()"
          [disabled]="isLoading()"
          rows="1"
          class="textarea"
        ></textarea>
        <button class="send-btn" [class.active]="canSend()" [disabled]="!canSend()" (click)="handleSend()">
          <span>↑</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-input { display: flex; flex-direction: column; gap: 4px; border: 1px solid #e5e5e5; background: #fff; padding: 8px; transition: border-color 0.15s, border-radius 0.15s; border-radius: 9999px; }
    .chat-input.expanded { border-radius: 16px; }
    .chat-input:focus-within { border-color: rgba(0,0,0,0.4); }
    .file-row { display: flex; gap: 8px; overflow-x: auto; padding: 4px; }
    .input-row { display: flex; align-items: flex-end; }
    .hidden { display: none; }
    .attach-btn { display: flex; width: 28px; height: 28px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; border: none; background: none; color: #888; cursor: pointer; font-size: 18px; }
    .attach-btn:hover { color: #111; }
    .attach-btn:disabled { cursor: not-allowed; opacity: 0.5; }
    .textarea { flex: 1; resize: none; border: none; background: transparent; padding: 4px 8px; font-size: 14px; line-height: 20px; outline: none; font-family: inherit; min-height: 20px; max-height: 120px; }
    .textarea::placeholder { color: #888; }
    .textarea:disabled { cursor: not-allowed; opacity: 0.5; }
    .send-btn { display: flex; width: 28px; height: 28px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; border: none; cursor: not-allowed; background: #e5e5e5; color: #888; transition: background 0.15s, color 0.15s; }
    .send-btn.active { cursor: pointer; background: #111; color: #fff; }
    .send-btn.active:hover { opacity: 0.8; }
  `],
})
export class ChatInputComponent implements AfterViewInit {
  value = input("")
  isLoading = input(false)
  placeholder = input("Send a message...")
  enableFileUpload = input(false)

  sendEvent = output<{ message: string; files?: File[] }>({ alias: "send" })
  valueChange = output<string>()

  files = signal<File[]>([])
  hasFiles = computed(() => this.files().length > 0)
  isExpanded = computed(() => this.hasFiles())
  canSend = computed(() => (this.value().trim() || this.hasFiles()) && !this.isLoading())

  @ViewChild("textareaEl") textareaEl!: ElementRef<HTMLTextAreaElement>

  ngAfterViewInit() {
    this.resize()
  }

  resize() {
    const el = this.textareaEl?.nativeElement
    if (!el) return
    el.style.height = "0"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden"
  }

  onInput(e: Event) {
    const val = (e.target as HTMLTextAreaElement).value
    this.valueChange.emit(val)
    setTimeout(() => this.resize())
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      this.handleSend()
    }
  }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.files.update((f) => [...f, ...Array.from(input.files!)])
    }
    input.value = ""
  }

  removeFile(index: number) {
    this.files.update((f) => f.filter((_, i) => i !== index))
  }

  handleSend() {
    const message = this.value().trim()
    if ((!message && !this.hasFiles()) || this.isLoading()) return
    const sendFiles = this.files().length > 0 ? [...this.files()] : undefined
    this.files.set([])
    this.valueChange.emit("")
    this.sendEvent.emit({ message, files: sendFiles })
  }
}
