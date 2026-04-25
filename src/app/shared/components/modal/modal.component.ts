import { ChangeDetectionStrategy, Component, inject, viewChild, ViewContainerRef } from '@angular/core';
import { ModalService } from '@axe/shared/ui/modal.service';

@Component({
  selector: 'modal',
  templateUrl: './modal.component.html',
  host: { class: 'block' },
  styles: [
    `
      .component {
        box-sizing: border-box;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1899999;

        display: flex;
        align-items: center;
        justify-content: center;

        overscroll-behavior: contain;
      }

      .modal-background {
        box-sizing: border-box;
        position: absolute;
        color: #ccc;
        background-color: rgba(30, 30, 30, 0.3);
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: -1;
      }

      .modal-panel {
        box-sizing: border-box;
        overflow: hidden;

        color: #444;
        background: linear-gradient(-30deg, rgba(240, 218, 189, 0.9), rgba(255, 244, 232, 0.9));
        border: solid 1px #999;

        height: auto;
        max-height: calc(100% - 10px);
        width: 800px;
        max-width: 100%;
      }

      .title {
        position: relative;
        overflow: hidden;
        white-space: nowrap;
        box-sizing: border-box;
        font-size: 12px;
        height: 25px;
        padding: 2px 5px;
        width: 100%;
        background-color: #ccc;
        color: #444;
      }

      .title-button {
        position: absolute;
        right: 0;
        top: 0;
      }

      .title button {
        background: none;
        border: none;
        border-radius: 0;
        outline: none;
        color: #444;
      }

      .header,
      .content,
      footer {
        padding: 10px;
      }

      .scrollable-panel {
        box-sizing: border-box;
        overflow: auto;
        max-height: calc(100vh - 41px);
        width: 100%;
        padding: 8px;
      }
    `,
  ],
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
