import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'text-view',
  templateUrl: './text-view.component.html',
  styleUrls: ['./text-view.component.css'],
})
export class TextViewComponent {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

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
