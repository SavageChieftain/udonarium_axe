import { inject, Injectable } from '@angular/core';
import { ConfirmDialogOption } from '@axe/application/ui/confirm-option';
import { ModalService } from '@axe/application/ui/modal.service';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  static dialogComponentClass: { new (...args: unknown[]): unknown } = null!;

  private readonly modalService = inject(ModalService);

  ask(option: ConfirmDialogOption | string): Promise<boolean> {
    const asked = typeof option === 'string' ? { message: option } : option;
    if (!ConfirmService.dialogComponentClass) return Promise.resolve(window.confirm(asked.message));
    return this.modalService
      .open<unknown>(ConfirmService.dialogComponentClass, asked)
      .then((answer) => answer === true)
      .catch(() => false);
  }
}
