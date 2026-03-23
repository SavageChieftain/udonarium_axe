import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ImageStorage } from '@axe/class/core/file-storage/image-storage';
import { EventSystem, Network } from '@axe/class/core/system';
import { ImageTag } from '@axe/class/image-tag';
import { SafePipe } from '@axe/pipe/safe.pipe'; //本家PR #92より
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';

@Component({
  selector: 'file-selector',
  templateUrl: './file-selecter.component.html',
  styleUrls: ['./file-selecter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe],
})
export class FileSelecterComponent implements OnInit, OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private imageStorage = inject(ImageStorage);

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
  //

  @Input() isAllowedEmpty: boolean = false;

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

  selectTag: string = '';
  fileStorageService = this.imageStorage;

  identifierList: string[] = [];
  newTagName: string = '';

  resetBtn() {}

  onChange(fileName: string, checked: boolean) {
    const imageTag = ImageTag.get(fileName);
    if (!imageTag) ImageTag.create(fileName);

    if (checked) {
      if (this.identifierList.indexOf(fileName) < 0) {
        this.identifierList.push(fileName);
      }
    } else {
      if (this.identifierList.indexOf(fileName) > -1) {
        this.identifierList.splice(this.identifierList.indexOf(fileName), 1);
      }
    }
  }

  get empty(): ImageFile {
    return ImageFile.Empty;
  }

  constructor() {
    const option = this.modalService.option as Record<string, unknown>;
    this.isAllowedEmpty = option && option.isAllowedEmpty ? true : false;
  }

  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'ファイル一覧'));
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

  onSelectedFile(file: ImageFile) {
    EventSystem.call('SELECT_FILE', { fileIdentifier: file.identifier }, Network.peerId);
    this.modalService.resolve(file.identifier);
  }
}
