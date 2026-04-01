import { ChangeDetectionStrategy, Component, inject, viewChild, ViewContainerRef } from '@angular/core';
import { ModalService } from '@axe/shared/ui/modal.service';

@Component({
  selector: 'modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  modalService = inject(ModalService);

  get title(): string {
    return this.modalService.title;
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
