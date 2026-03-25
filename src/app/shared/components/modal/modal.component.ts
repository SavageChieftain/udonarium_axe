import { ChangeDetectionStrategy, Component, inject, ViewChild, ViewContainerRef } from '@angular/core';
import { ModalService } from '@axe/shared/modal.service';

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

  @ViewChild('content', { read: ViewContainerRef, static: true }) content: ViewContainerRef;

  clickBackground(event: MouseEvent) {
    if (event.target === event.currentTarget) this.resolve();
  }

  resolve() {
    this.modalService.resolve(null!);
  }

  reject() {
    this.modalService.reject();
  }
}
