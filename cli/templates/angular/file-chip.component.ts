import { Component, input } from "@angular/core"
import type { FileData } from "llm-chat-ui"

@Component({
  selector: "file-chip",
  standalone: true,
  template: `
    <div class="file-chip">
      <span class="icon">{{ iconLabel().icon }}</span>
      <div class="info">
        <span class="name">{{ file().name }}</span>
        <span class="label">{{ iconLabel().label }}</span>
      </div>
    </div>
  `,
  styles: [`
    .file-chip { display: flex; align-items: center; gap: 6px; height: 40px; width: 110px; flex-shrink: 0; border-radius: 6px; border: 1px solid #e5e5e5; padding: 0 8px; }
    .icon { font-size: 14px; flex-shrink: 0; }
    .info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .name { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .label { font-size: 10px; color: #888; }
  `],
})
export class FileChipComponent {
  file = input.required<FileData>()

  iconLabel() {
    const type = this.file().type
    if (type.startsWith("image/")) return { icon: "🖼", label: "Image" }
    if (type === "application/pdf") return { icon: "📄", label: "PDF" }
    if (type.startsWith("text/")) return { icon: "📝", label: "Document" }
    return { icon: "📎", label: "File" }
  }
}
