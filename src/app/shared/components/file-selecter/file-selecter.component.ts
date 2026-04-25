import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { emitSelectFile } from '@axe/domain/domain-events';
import { ImageTag } from '@axe/domain/media/image-tag';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  selector: 'file-selector',
  templateUrl: './file-selecter.component.html',
  host: { class: 'block' },
  styles: [
    `
      .image {
        font-size: 0;
      }

      .image img {
        vertical-align: bottom;
      }

      .empty {
        line-height: 120px;
        vertical-align: middle;
      }

      .empty button {
        height: 100px;
      }

      .sticky-top {
        padding: 5px;
        position: sticky;
        top: 0;
        background-color: rgba(240, 218, 189, 0.8);
        border-top: 1px dotted #666;
        border-bottom: 1px dotted #666;
      }

      .sticky-top input {
        width: calc(100% - 75px);
      }

      .image-chg {
        padding: 5px;
        user-select: none;
      }

      .image-chg label {
        display: inline-block;
        position: relative;
      }

      .image-chg input[type='radio'] {
        display: none;
      }

      .image-chg input[type='radio'] + div {
        display: inline-block;
        vertical-align: middle;
        outline: 0;
        font-size: 12px;
        background-color: transparent;
        color: #444;
        border: solid 1px #555;
        padding: 2px 8px;
        margin: 2px;
        border-radius: 100px;
        cursor: pointer;
      }

      .image-chg input[type='radio'] + div:hover {
        background-color: #888;
        color: #eee;
        border: solid 1px #555;
      }

      .image-chg input[type='radio']:checked + div {
        background: #555;
        color: #ccc;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe],
})
export class FileSelecterComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);

  isAllowedEmpty: boolean = false;

  getAllImage(): ImageFile[] {
    const imageFileList: ImageFile[] = [];

    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;
      let tag: string = '';
      if (ImageTag.get(identifier)) tag = ImageTag.get(identifier).tag;

      if (tag != 'システム予約')
        //システム予約名を非表示
        imageFileList.push(imageFile);
    }
    return imageFileList;
  }

  readonly images = computed(() => {
    this.objectChange.fileVersion();
    const imageFileList: ImageFile[] = [];
    if (this.selectTag() == '全て') return this.getAllImage();

    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;

      if (ImageTag.get(identifier)) {
        const tag: string = ImageTag.get(identifier).tag;
        if (this.selectTag() == tag) {
          imageFileList.push(imageFile);
        }
      } else {
        //タグ未設定の場合 画像投下直後は ImageTag.get(identifier) は空文字ではなく該当なしとなるため
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
          if (imageTag.tag != 'システム予約')
            //システム予約名を非表示
            tags.push(imageTag.tag);
        }
      }
    }

    const tags2: string[] = Array.from(new Set(tags));
    tags2.unshift('全て');
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
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'ファイル一覧'));
  }

  onSelectedFile(file: ImageFile) {
    emitSelectFile({ fileIdentifier: file.identifier });
    this.modalService.resolve(file.identifier);
  }
}
