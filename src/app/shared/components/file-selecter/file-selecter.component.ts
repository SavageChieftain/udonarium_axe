import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { emitSelectFile } from '@axe/domain/domain-events';
import { ImageTag } from '@axe/domain/media/image-tag';
import { SafePipe } from '@axe/shared/pipes/safe.pipe'; //本家PR #92より
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  selector: 'file-selector',
  templateUrl: './file-selecter.component.html',
  styleUrls: ['./file-selecter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe],
})
export class FileSelecterComponent implements OnInit {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private imageStorage = inject(ImageStorage);
  private objectChange = inject(ObjectChangeService);

  //本家PR #92より
  searchWord: string = '';

  private _searchWord!: string;

  private _searchWords!: string[];
  get searchWords(): string[] {
    if (this._searchWord !== this.searchWord) {
      this._searchWord = this.searchWord;
      this._searchWords =
        this.searchWord != null && this.searchWord.trim().length > 0 ? this.searchWord.trim().split(/\s+/) : [];
    }
    return this._searchWords;
  }
  //

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

  //本家PR #92より
  get images(): ImageFile[] {
    this.objectChange.fileVersion();
    const imageFileList: ImageFile[] = [];
    if (this.selectTag == '全て') return this.getAllImage();

    for (const imageFile of this.fileStorageService.images) {
      const identifier = imageFile.context.identifier;

      if (ImageTag.get(identifier)) {
        const tag: string = ImageTag.get(identifier).tag;
        if (this.selectTag == tag) {
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

  selectTag: string = '';
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
  }

  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'ファイル一覧'));
  }

  onSelectedFile(file: ImageFile) {
    emitSelectFile({ fileIdentifier: file.identifier });
    this.modalService.resolve(file.identifier);
  }
}
