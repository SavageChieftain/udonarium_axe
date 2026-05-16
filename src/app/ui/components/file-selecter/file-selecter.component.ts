import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { emitSelectFile } from '@axe/core/event/domain-events';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ImageTag } from '@axe/domain/media/image-tag';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'file-selector',
  templateUrl: './file-selecter.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class FileSelecterComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly t = inject(TRANSLATE_FN);

  isAllowedEmpty: boolean = false;

  private get systemReservedTag(): string {
    return this.t('ui.fileSelecter.systemReserved');
  }
  private get allTag(): string {
    return this.t('ui.fileSelecter.tagAll');
  }

  getAllImage(): ImageFile[] {
    const imageFileList: ImageFile[] = [];

    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;
      let tag: string = '';
      if (ImageTag.get(identifier)) tag = ImageTag.get(identifier).tag;

      if (tag != this.systemReservedTag) imageFileList.push(imageFile);
    }
    return imageFileList;
  }

  readonly images = computed(() => {
    this.objectChange.fileVersion();
    const imageFileList: ImageFile[] = [];
    if (this.selectTag() == this.allTag) return this.getAllImage();

    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;

      if (ImageTag.get(identifier)) {
        const tag: string = ImageTag.get(identifier).tag;
        if (this.selectTag() == tag) {
          imageFileList.push(imageFile);
        }
      } else {
        if (this.selectTag() == '') {
          imageFileList.push(imageFile);
        }
      }
    }

    return imageFileList;
  });

  selectedFile: ImageFile | null = null;
  get isSelected(): boolean {
    return this.selectedFile !== null;
  }
  get selectedImageTag(): ImageTag | null {
    if (!this.isSelected || this.selectedFile === null) return null;
    const imageTag = ImageTag.get(this.selectedFile.identifier);
    return imageTag ? imageTag : ImageTag.create(this.selectedFile.identifier);
  }

  get tagList(): string[] {
    const tags: string[] = [];
    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;
      const imageTag = ImageTag.get(identifier);
      if (imageTag) {
        if (imageTag.tag) {
          if (imageTag.tag != this.systemReservedTag) tags.push(imageTag.tag);
        }
      }
    }

    const tags2: string[] = Array.from(new Set(tags));
    tags2.unshift(this.allTag);
    tags2.unshift('');
    return tags2;
  }

  readonly selectTag = signal('');
  fileStorageService = this.imageStorage;

  identifierList: string[] = [];
  newTagName: string = '';

  resetBtn() {}

  onChange(fileName: string, checked: boolean) {
    const imageTag = ImageTag.get(fileName);
    if (!imageTag) ImageTag.create(fileName);

    if (checked) {
      if (!this.identifierList.includes(fileName)) {
        this.identifierList.push(fileName);
      }
    } else {
      const index = this.identifierList.indexOf(fileName);
      if (index >= 0) {
        this.identifierList.splice(index, 1);
      }
    }
  }

  get empty(): ImageFile {
    return ImageFile.Empty;
  }

  constructor() {
    const option = this.modalService.option as Record<string, unknown>;
    this.isAllowedEmpty = !!option?.isAllowedEmpty;
    queueMicrotask(() => (this.modalService.title = this.panelService.title = this.t('ui.fileSelecter.panelTitle')));
  }

  onSelectedFile(file: ImageFile) {
    emitSelectFile({ fileIdentifier: file.identifier });
    this.modalService.resolve(file.identifier);
  }
}
