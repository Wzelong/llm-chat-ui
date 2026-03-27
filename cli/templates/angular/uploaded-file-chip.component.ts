import { Component, input, output } from "@angular/core"

@Component({
  selector: "uploaded-file-chip",
  standalone: true,
  template: `
    <div class="uploaded-chip">
      <span class="icon">{{ iconLabel().icon }}</span>
      <div class="info">
        <span class="name">{{ file().name }}</span>
        <span class="label">{{ iconLabel().label }}</span>
      </div>
      <button class="remove-btn" (click)="remove.emit()">x</button>
    </div>
  `,
  styles: [`
    .uploaded-chip { position: relative; display: flex; align-items: center; gap: 8px; height: 48px; width: 180px; flex-shrink: 0; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; padding: 0 12px; }
    .icon { font-size: 18px; flex-shrink: 0; }
    .info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .name { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .label { font-size: 12px; color: #888; }
    .remove-btn { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; border: none; background: #f0f0f0; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
    .uploaded-chip:hover .remove-btn { opacity: 1; }
  `],
})
export class UploadedFileChipComponent {
  file = input.required<File>()
  remove = output()

  iconLabel() {
    const type = this.file().type
    if (type.startsWith("image/")) return { icon: "🖼", label: "Image" }
    if (type === "application/pdf") return { icon: "📄", label: "PDF" }
    if (type.startsWith("text/")) return { icon: "📝", label: "Document" }
    return { icon: "📎", label: "File" }
  }
}
