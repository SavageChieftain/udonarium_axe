import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'text-view',
  templateUrl: './text-view.component.html',
  host: { class: 'block' },
})
export class TextViewComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);

  text: string = '';
  title: string = '';

  constructor() {
    const option = this.modalService.option as Record<string, unknown>;
    if (option && option.title != null) {
      this.title = option.title ? (option.title as string) : '';
      this.text = option.text ? (option.text as string) : '';
    }
    queueMicrotask(() => {
      this.panelService.title = this.title;
      this.modalService.title = this.title;
    });
  }
}
