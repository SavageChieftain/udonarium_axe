import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { emitSelectFile } from '@axe/domain/domain-events';
import { ImageTag } from '@axe/domain/media/image-tag';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  selector: 'file-storage',
  templateUrl: './file-storage.component.html',
  host: { class: 'block' },
  styles: [
    `
      .drop-zone {
        border: 2px dashed #555;
        -moz-border-radius: 5px;
        -webkit-border-radius: 5px;
        border-radius: 5px;
        padding: 25px;
        text-align: center;
        font: 24px bold 'Vollkorn';
        color: #444;
        cursor: pointer;
        margin-bottom: 5px;
      }

      .large-font {
        font-size: 64px;
      }

      .small-font {
        font-size: 12px;
      }

      .image {
        font-size: 0;
        display: inline-block;
        padding: 2px;
        border: transparent 2px solid;
        border-top: transparent 6px solid;
      }

      .image img {
        vertical-align: bottom;
      }

      .img-chk {
        height: 1em;
        margin-left: 0px;
      }

      .img-box {
        border: 2px dotted #666;
      }

      .selected {
        border: 2px dotted #666;
        border-top: 6px solid #444;
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
export class FileStorageComponent {
  private readonly panelService = inject(PanelService);
  private readonly imageStorage = inject(ImageStorage);
  private readonly fileArchiver = inject(FileArchiver);
  private readonly objectChange = inject(ObjectChangeService);

  protected checkedFiles = new Set<string>();

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
        if (tag == this.selectTag()) {
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

  fileStorageService = this.imageStorage;

  onInputNewTag(event: Event): void {
    this.newTagName.set((event.target as HTMLInputElement).value);
  }

  changeTag() {
    if (this.newTagName() == '全て') return; //表示上混乱するタグの禁止
    if (this.newTagName() == 'システム予約') return; //システム予約名称

    const changeableImages = this.images();

    for (const img of changeableImages) {
      if (this.checkedFiles.has(img.context.identifier)) {
        let imageTag = ImageTag.get(img.context.identifier);
        imageTag = imageTag ? imageTag : ImageTag.create(img.context.identifier);
        if (this.newTagName() == '未設定') {
          imageTag.tag = '';
        } else {
          imageTag.tag = this.newTagName();
        }
      }
    }
  }

  readonly selectTag = signal('');
  readonly newTagName = signal<string>('');

  resetBtn() {
    //  処理なし
  }

  constructor() {
    queueMicrotask(() => (this.panelService.title = 'ファイル一覧'));
  }

  handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
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
