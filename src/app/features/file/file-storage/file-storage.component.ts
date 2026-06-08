import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { emitSelectFile } from '@axe/core/event/domain-events';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ImageTag } from '@axe/domain/media/image-tag';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

const ALL_TAG = '__all__';

@Component({
  selector: 'file-storage',
  templateUrl: './file-storage.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class FileStorageComponent {
  private readonly panelService = inject(PanelService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly t = inject(TRANSLATE_FN);

  displayTagName(tag: string): string {
    if (tag === ALL_TAG) return this.t('feature.file.fileStorage.all');
    if (!tag) return this.t('feature.file.fileStorage.unset');
    return tag;
  }

  protected checkedFiles = new Set<string>();

  getAllImage(): ImageFile[] {
    const imageFileList: ImageFile[] = [];

    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;
      let tag: string = '';
      if (ImageTag.get(identifier)) tag = ImageTag.get(identifier).tag;

      if (tag != 'システム予約') imageFileList.push(imageFile);
    }
    return imageFileList;
  }

  readonly images = computed(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('image-tag')();
    const imageFileList: ImageFile[] = [];
    if (this.selectTag() == ALL_TAG) return this.getAllImage();
    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;
      const imageTag = ImageTag.get(identifier);

      if (imageTag) {
        this.objectChange.versionOf(imageTag.identifier)();
        const tag: string = imageTag.tag;
        if (tag == this.selectTag()) {
          imageFileList.push(imageFile);
        }
      } else if (this.selectTag() == '') {
        imageFileList.push(imageFile);
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

  readonly tagList = computed<string[]>(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('image-tag')();
    const tags: string[] = [];
    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;
      const imageTag = ImageTag.get(identifier);
      if (imageTag) {
        this.objectChange.versionOf(imageTag.identifier)();
        if (imageTag.tag && imageTag.tag != 'システム予約') tags.push(imageTag.tag);
      }
    }

    const tags2: string[] = Array.from(new Set(tags));
    tags2.unshift(ALL_TAG);
    tags2.unshift('');
    return tags2;
  });

  fileStorageService = this.imageStorage;

  onInputNewTag(event: Event): void {
    this.newTagName.set((event.target as HTMLInputElement).value);
  }

  changeTag() {
    const candidate = this.newTagName();
    if (candidate === ALL_TAG) return;
    if (candidate === 'システム予約') return;
    if (candidate === this.t('feature.file.fileStorage.all')) return;

    const changeableImages = this.images();

    for (const img of changeableImages) {
      if (this.checkedFiles.has(img.context.identifier)) {
        let imageTag = ImageTag.get(img.context.identifier);
        imageTag = imageTag ? imageTag : ImageTag.create(img.context.identifier);
        if (candidate === this.t('feature.file.fileStorage.unset')) {
          imageTag.tag = '';
        } else {
          imageTag.tag = candidate;
        }
      }
    }
  }

  readonly selectTag = signal('');
  readonly newTagName = signal<string>('');

  resetBtn() {}

  constructor() {
    queueMicrotask(() => (this.panelService.title = this.t('common.panel.fileStorage')));
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!this.rolePermission.canEditTabletop) {
      input.value = '';
      return;
    }
    const files = input.files;
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }

  onSelectedFile(file: ImageFile) {
    emitSelectFile({ fileIdentifier: file.identifier });

    this.selectedFile = file;
  }

  imgBlockClick(identifier: string) {
    if (this.checkedFiles.has(identifier)) {
      this.checkedFiles.delete(identifier);
    } else {
      this.checkedFiles.add(identifier);
    }
  }
}
