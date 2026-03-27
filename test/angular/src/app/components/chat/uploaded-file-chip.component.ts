import { Component, Input, Output, EventEmitter } from '@angular/core'

@Component({
  selector: 'uploaded-file-chip',
  standalone: true,
  template: `
    <div class="chip">
      <span class="icon">{{ getIcon() }}</span>
      <div class="info">
        <span class="name">{{ file?.name }}</span>
        <span class="label">{{ getLabel() }}</span>
      </div>
      <button class="remove" (click)="remove.emit()">&times;</button>
    </div>
  `,
  styles: [`
    .chip { position: relative; display: flex; align-items: center; gap: 8px; height: 48px; width: 180px; flex-shrink: 0; border-radius: 8px; border: 1px solid #e5e5e5; background: #fff; padding: 0 12px; }
    .icon { font-size: 14px; flex-shrink: 0; color: #888; }
    .info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .name { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .label { font-size: 12px; color: #888; }
    .remove { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; border: none; background: #eee; font-size: 12px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
    .chip:hover .remove { opacity: 1; }
  `],
})
export class UploadedFileChipComponent {
  @Input() file: any = { name: '', type: '' }
  @Output() remove = new EventEmitter<void>()
  getIcon() { const t = this.file?.type || ''; if (t.startsWith('image/')) return '[img]'; if (t === 'application/pdf') return '[pdf]'; if (t.startsWith('text/')) return '[doc]'; return '[file]' }
  getLabel() { const t = this.file?.type || ''; if (t.startsWith('image/')) return 'Image'; if (t === 'application/pdf') return 'PDF'; if (t.startsWith('text/')) return 'Document'; return 'File' }
}
