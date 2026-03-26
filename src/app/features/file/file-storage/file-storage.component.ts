import { AfterViewInit, ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { emitSelectFile } from '@axe/domain/domain-events';
import { ImageTag } from '@axe/domain/media/image-tag';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { PanelService } from '@axe/shared/panel.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe'; //本家PR #92より

@Component({
  selector: 'file-storage',
  templateUrl: './file-storage.component.html',
  styleUrls: ['./file-storage.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe],
})
export class FileStorageComponent implements OnInit, OnDestroy, AfterViewInit {
  private panelService = inject(PanelService);
  private imageStorage = inject(ImageStorage);
  private fileArchiver = inject(FileArchiver);
  private objectChange = inject(ObjectChangeService);

  protected checkedFiles = new Set<string>();

  //本家PR #92より
  searchWord: string = '';
  private _searchWord!: string;
  private _searchWords!: string[];
  get searchWords(): string[] {
    if (this._searchWord !== this.searchWord) {
      this._searchWord = this.searchWord;
      this._searchWords =
        this.searchWord != null && 0 < this.searchWord.trim().length ? this.searchWord.trim().split(/\s+/) : [];
    }
    return this._searchWords;
  }

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

  get images(): ImageFile[] {
    this.objectChange.fileVersion();
    const imageFileList: ImageFile[] = [];
    if (this.selectTag == '全て') return this.getAllImage();
    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;

      if (ImageTag.get(identifier)) {
        //
        const tag: string = ImageTag.get(identifier).tag;
        if (tag == this.selectTag) {
          imageFileList.push(imageFile);
        }
      } else {
        //タグ未設定の場合 画像投下直後は ImageTag.get(identifier) は空文字ではなく該当なしとなるため
        if (this.selectTag == '') {
          imageFileList.push(imageFile);
        }
      }
    }
    return imageFileList;
  }

  selectedFile: ImageFile = null!;
  get isSelected(): boolean {
    return this.selectedFile != null;
  }
  get selectedImageTag(): ImageTag {
    if (!this.isSelected) return null!;
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

  inputNewTag(newTag: string) {
    this.newTagName = newTag;
  }

  changeTag() {
    if (this.newTagName == '全て') return; //表示上混乱するタグの禁止
    if (this.newTagName == 'システム予約') return; //システム予約名称

    const changeableImages = this.images;

    for (const img of changeableImages) {
      if (this.checkedFiles.has(img.context.identifier)) {
        let imageTag = ImageTag.get(img.context.identifier);
        imageTag = imageTag ? imageTag : ImageTag.create(img.context.identifier);
        if (this.newTagName == '未設定') {
          imageTag.tag = '';
        } else {
          imageTag.tag = this.newTagName;
        }
      }
    }
  }

  selectTag: string = '';
  newTagName: string = '';

  resetBtn() {
    //  処理なし
  }

  //本家PR #92より
  constructor() {}

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = 'ファイル一覧'));
  }

  ngAfterViewInit() {}

  ngOnDestroy() {}

  handleFileSelect(event: Event) {
    const input = <HTMLInputElement>event.target;
    const files = input.files;
    if (files && files.length) this.fileArchiver.load(files);
    input.value = '';
  }

  onSelectedFile(file: ImageFile) {
    emitSelectFile({ fileIdentifier: file.identifier });

    this.selectedFile = file; //本家PR #92より
  }

  imgBlockClick(identifier: string) {
    if (this.checkedFiles.has(identifier)) {
      this.checkedFiles.delete(identifier);
    } else {
      this.checkedFiles.add(identifier);
    }
  }
}
