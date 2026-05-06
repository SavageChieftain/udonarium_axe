import { ChangeDetectionStrategy, Component, inject, viewChild, ViewContainerRef } from '@angular/core';
import { TextTooltipDirective } from '@axe/shared/directives/text-tooltip.directive';
import { ModalService } from '@axe/shared/ui/modal.service';

@Component({
  imports: [TextTooltipDirective],
  selector: 'modal',
  templateUrl: './modal.component.html',
  host: { class: 'block' },
  styleUrls: ['./modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  modalService = inject(ModalService);

  get title(): string {
    return this.modalService.title;
  }

  get titleTooltip(): string {
    return this.modalService.titleTooltip;
  }

  readonly content = viewChild.required('content', { read: ViewContainerRef });

  clickBackground(event: MouseEvent) {
    if (event.target === event.currentTarget) this.resolve();
  }

  resolve() {
    this.modalService.resolve(null);
  }

  reject() {
    this.modalService.reject();
  }
}
