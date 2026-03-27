import { Component, Input } from '@angular/core'

@Component({
  selector: 'file-chip',
  standalone: true,
  template: `
    <div class="chip">
      <span class="icon">{{ getIcon() }}</span>
      <div class="info">
        <span class="name">{{ file?.name }}</span>
        <span class="label">{{ getLabel() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .chip { display: flex; align-items: center; gap: 6px; height: 40px; width: 110px; flex-shrink: 0; border-radius: 6px; border: 1px solid #e5e5e5; padding: 0 8px; }
    .icon { font-size: 12px; flex-shrink: 0; color: #888; }
    .info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .name { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .label { font-size: 10px; color: #888; }
  `],
})
export class FileChipComponent {
  @Input() file: any = { name: '', type: '' }
  getIcon() { const t = this.file?.type || ''; if (t.startsWith('image/')) return '[img]'; if (t === 'application/pdf') return '[pdf]'; if (t.startsWith('text/')) return '[doc]'; return '[file]' }
  getLabel() { const t = this.file?.type || ''; if (t.startsWith('image/')) return 'Image'; if (t === 'application/pdf') return 'PDF'; if (t.startsWith('text/')) return 'Document'; return 'File' }
}
