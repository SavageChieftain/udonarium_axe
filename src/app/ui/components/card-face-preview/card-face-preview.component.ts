import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { Card } from '@axe/domain/card/card';
import { CardFaceTextComponent } from '@axe/ui/components/card-face-text/card-face-text.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { containedImageRect } from '@axe/ui/tabletop/contained-image-rect';

@Component({
  selector: 'card-face-preview',
  templateUrl: './card-face-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardFaceTextComponent, SafePipe],
})
export class CardFacePreviewComponent {
  readonly card = input.required<Card>();
  readonly imageUrl = input('');
  readonly frameWidth = input.required<number>();
  readonly frameHeight = input.required<number>();
  readonly padding = input(0);

  private readonly tabletop = inject(TabletopService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly naturalSize = linkedSignal<string, { width: number; height: number }>({
    source: () => this.imageUrl(),
    computation: () => ({ width: 0, height: 0 }),
  });

  readonly imageRect = computed(() => {
    const { width, height } = this.naturalSize();
    return containedImageRect(this.frameWidth(), this.frameHeight(), width, height, this.padding());
  });

  readonly textScale = computed(() => {
    const width = this.imageRect()?.width ?? 0;
    const card = this.card();
    this.objectChange.versionOf(card.identifier)();
    const cardSize = card.size;
    const gridSize = this.tabletop.gridSize();
    return width && cardSize && gridSize ? width / (cardSize * gridSize) : 1;
  });

  protected onImageLoad(image: HTMLImageElement): void {
    this.naturalSize.set({ width: image.naturalWidth, height: image.naturalHeight });
  }
}
