import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

import { FileArchiver } from '@axe/core/file-storage/file-archiver';
import { ImageFile } from '@axe/core/file-storage/image-file';
import { ImageStorage } from '@axe/core/file-storage/image-storage';
import { EventSystem, Network } from '@axe/core/system';

import { PanelService } from 'service/panel.service';

import { ImageTag } from '@axe/image-tag';
import { FormsModule } from '@angular/forms';
import { SafePipe } from 'pipe/safe.pipe'; //本家PR #92より

@Component({
  selector: 'file-storage',
  templateUrl: './file-storage.component.html',
  styleUrls: ['./file-storage.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe],
})
export class FileStorageComponent implements OnInit, OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);

  protected initTimestamp: number = 0;

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

  fileStorageService = ImageStorage.instance;

  inputNewTag(newTag: string) {
    this.newTagName = newTag;
  }

  changeTag() {
    if (this.newTagName == '全て') return; //表示上混乱するタグの禁止
    if (this.newTagName == 'システム予約') return; //システム予約名称

    const changeableImages = this.images;

    for (const img of changeableImages) {
      const box = <HTMLInputElement>document.getElementById(img.context.identifier + '_' + this.initTimestamp);
      if (box) {
        if (box.checked) {
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
  }

  selectTag: string = '';
  newTagName: string = '';

  resetBtn() {
    //  処理なし
  }

  //本家PR #92より
  constructor() {
    this.initTimestamp = Date.now();
  }

  ngOnInit() {
    queueMicrotask(() => (this.panelService.title = 'ファイル一覧'));
  }

  ngAfterViewInit() {
    EventSystem.register(this).on('SYNCHRONIZE_FILE_LIST', (event) => {
      if (event.isSendFromSelf) {
        this.changeDetector.markForCheck();
      }
    });
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  handleFileSelect(event: Event) {
    const input = <HTMLInputElement>event.target;
    const files = input.files;
    if (files && files.length) FileArchiver.instance.load(files);
    input.value = '';
  }

  onSelectedFile(file: ImageFile) {
    EventSystem.call('SELECT_FILE', { fileIdentifier: file.identifier }, Network.peerId);

    this.selectedFile = file; //本家PR #92より
  }

  imgBlockClick(identifier: string) {
    const box = <HTMLInputElement>document.getElementById(identifier + '_' + this.initTimestamp);
    box.checked = !box.checked;
  }

  onChange(identifier: string) {
    this.imgBlockClick(identifier);
  }
}
