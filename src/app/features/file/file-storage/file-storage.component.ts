import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { emitSelectFile } from '@axe/core/event/domain-events';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ImageTag } from '@axe/domain/media/image-tag';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  selector: 'file-storage',
  templateUrl: './file-storage.component.html',
  host: { class: 'block' },
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
    // ImageTag コレクションの増減と各タグ値の変更を tracking する
    this.objectChange.collectionOf('image-tag')();
    const imageFileList: ImageFile[] = [];
    if (this.selectTag() == '全て') return this.getAllImage();
    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;
      const imageTag = ImageTag.get(identifier);

      if (imageTag) {
        this.objectChange.versionOf(imageTag.identifier)();
        const tag: string = imageTag.tag;
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

  readonly tagList = computed<string[]>(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('image-tag')();
    const tags: string[] = [];
    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;
      const imageTag = ImageTag.get(identifier);
      if (imageTag) {
        this.objectChange.versionOf(imageTag.identifier)();
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
  });

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
