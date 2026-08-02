import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '@axe/application/ui/modal.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ImageTag } from '@axe/domain/media/image-tag';
import { TranslocoModule } from '@jsverse/transloco';

const SYSTEM_RESERVED_TAG = 'system';

export interface DeckBuilderResult {
  tag: string;
  useImageName: boolean;
}

@Component({
  selector: 'deck-builder-dialog',
  templateUrl: './deck-builder-dialog.component.html',
  host: { class: 'text-ui-text block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
})
export class DeckBuilderDialogComponent {
  private readonly modalService = inject(ModalService);
  private readonly imageStorage = inject(ImageStorage);

  readonly selectedTag = signal('');
  readonly useImageName = signal(true);

  readonly tags = computed(() => {
    const tags = new Set<string>();
    for (const image of this.imageStorage.images) {
      const tag = ImageTag.get(image.identifier)?.tag ?? '';
      if (tag.length > 0 && tag !== SYSTEM_RESERVED_TAG) tags.add(tag);
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  });

  readonly cardCount = computed(() => this.imagesOf(this.selectedTag()).length);

  imagesOf(tag: string): { identifier: string }[] {
    if (tag.length < 1) return [];
    return this.imageStorage.images.filter((image) => (ImageTag.get(image.identifier)?.tag ?? '') === tag);
  }

  confirm(): void {
    if (this.cardCount() < 1) {
      this.modalService.resolve(null);
      return;
    }
    this.modalService.resolve({ tag: this.selectedTag(), useImageName: this.useImageName() });
  }

  cancel(): void {
    this.modalService.resolve(null);
  }
}
