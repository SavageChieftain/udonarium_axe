import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '@axe/shared/ui/modal.service';

export interface CardDrawCountDialogOption {
  maxCount: number;
  defaultCount?: number;
}

@Component({
  selector: 'card-draw-count-dialog',
  templateUrl: './card-draw-count-dialog.component.html',
  host: { class: 'block text-ui-text' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class CardDrawCountDialogComponent {
  private readonly modalService = inject(ModalService);

  readonly option = this.readOption();
  count = this.clampCount(this.option.defaultCount ?? Math.min(2, this.option.maxCount));

  get maxCount(): number {
    return this.option.maxCount;
  }

  confirm() {
    if (this.maxCount < 1) {
      this.modalService.resolve(null);
      return;
    }
    this.modalService.resolve(this.clampCount(this.count));
  }

  cancel() {
    this.modalService.resolve(null);
  }

  private readOption(): CardDrawCountDialogOption {
    const option = this.modalService.option as Partial<CardDrawCountDialogOption> | undefined;
    const maxCount = Math.max(0, this.normalizePositiveInteger(option?.maxCount, 0));
    const defaultCount =
      option?.defaultCount == null ? undefined : this.normalizePositiveInteger(option.defaultCount, 1);
    return { maxCount, defaultCount };
  }

  private clampCount(value: number): number {
    if (this.maxCount < 1) return 0;
    return Math.min(this.maxCount, Math.max(1, this.normalizePositiveInteger(value, 1)));
  }

  private normalizePositiveInteger(value: unknown, fallback: number): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.floor(num);
  }
}
