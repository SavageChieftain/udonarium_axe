import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  ViewChild,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { ModalService } from 'service/modal.service';

@Component({
  selector: 'modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent implements DoCheck {
  modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  title = '';

  @ViewChild('content', { read: ViewContainerRef, static: true }) content: ViewContainerRef;

  ngDoCheck(): void {
    if (this.title !== this.modalService.title) {
      this.title = this.modalService.title;
      this.cdr.markForCheck();
    }
  }

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
