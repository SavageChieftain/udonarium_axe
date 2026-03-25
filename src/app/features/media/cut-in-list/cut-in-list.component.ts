import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
//
import { FormsModule } from '@angular/forms';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { SaveDataService } from '@axe/core/save-data.service';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/Jukebox';
import { FileSelecterComponent } from '@axe/features/file/file-selecter/file-selecter.component';
import { CutInBgmComponent } from '@axe/features/media/cut-in-bgm/cut-in-bgm.component';
import { OpenUrlComponent } from '@axe/shared/components/open-url/open-url.component';
import { ModalService } from '@axe/shared/modal.service';
import { PanelService } from '@axe/shared/panel.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cut-in-list',
  templateUrl: './cut-in-list.component.html',
  styleUrls: ['./cut-in-list.component.css'],
  imports: [FormsModule, SafePipe],
})
export class CutInListComponent implements OnInit, OnDestroy {
  private pointerDeviceService = inject(PointerDeviceService);
  private modalService = inject(ModalService);
  private saveDataService = inject(SaveDataService);
  private panelService = inject(PanelService);
  private objectStore = inject(ObjectStore);
  private imageStorage = inject(ImageStorage);
  private audioStorage = inject(AudioStorage);

  _minSizeWidth = 10;
  _maxSizeWidth = 10;
  _minSizeHeight = 1200;
  _maxSizeHeight = 1200;

  get cutInLauncher(): CutInLauncher {
    return this.objectStore.get<CutInLauncher>('CutInLauncher');
  }

  get cutInName(): string {
    if (!this.selectedCutIn) return '';
    return this.isEditable ? this.selectedCutIn.name : '';
  }
  set cutInName(cutInName: string) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.name = cutInName;
  }

  set cutInWidth(cutInWidth: number) {
    if (!this.selectedCutIn) return;
    if (this.isEditable) this.selectedCutIn.width = cutInWidth;
    if (this.keepImageAspect) {
      if (this.isYouTubeCutIn) {
        this.selectedCutIn.height = Math.floor(
          (cutInWidth * this.selectedCutIn.defVideoSizeHeight) / this.selectedCutIn.defVideoSizeWidth
        );
      } else {
        this.selectedCutIn.height = Math.floor((cutInWidth * this.originalImgHeight()) / this.originalImgWidth());
      }
    }
  }

  set cutInHeight(cutInHeight: number) {
    if (!this.selectedCutIn) return;
    if (this.isEditable) this.selectedCutIn.height = cutInHeight;
    if (this.keepImageAspect) {
      if (this.isYouTubeCutIn) {
        this.selectedCutIn.width = Math.floor(
          (cutInHeight * this.selectedCutIn.defVideoSizeWidth) / this.selectedCutIn.defVideoSizeHeight
        );
      } else {
        this.selectedCutIn.width = Math.floor((cutInHeight * this.originalImgWidth()) / this.originalImgHeight());
      }
    }
  }

  get cutInWidth(): number {
    if (!this.isEditable) return 0;
    if (!this.selectedCutIn) return 0;

    if (this.cutInOriginalSize) {
      if (this.isYouTubeCutIn) {
        const width = this.selectedCutIn.defVideoSizeWidth;
        if (this.selectedCutIn.width != width) {
          this.selectedCutIn.width = width;
        }
      } else {
        const width = this.originalImgWidth();
        if (this.selectedCutIn.width != width) {
          this.selectedCutIn.width = width;
        }
      }
    }
    return this.selectedCutIn.width;
  }

  get cutInHeight(): number {
    if (!this.isEditable) return 0;
    if (!this.selectedCutIn) return 0;
    if (this.cutInOriginalSize) {
      if (this.isYouTubeCutIn) {
        const height = this.selectedCutIn.defVideoSizeHeight;
        if (this.selectedCutIn.height != height) {
          this.selectedCutIn.height = height;
        }
      } else {
        const height = this.originalImgHeight();
        if (this.selectedCutIn.height != height) {
          this.selectedCutIn.height = height;
        }
      }
    }
    return this.selectedCutIn.height;
  }

  get keepImageAspect(): boolean {
    if (!this.isEditable) return false;
    if (!this.selectedCutIn) return false;
    return this.selectedCutIn.keepImageAspect;
  }

  set keepImageAspect(aspect) {
    if (!this.isEditable) return;
    if (!this.selectedCutIn) return;
    this.selectedCutIn.keepImageAspect = aspect;
  }

  chkImageAspect() {
    if (!this.isEditable) return 0;
    if (!this.selectedCutIn) return 0;
    const cutIn = this.selectedCutIn;
    setTimeout(() => {
      if (this.keepImageAspect) {
        const imageurl = cutIn.cutInImage.url;
        if (imageurl.length > 0) {
          const img = new Image();
          img.src = imageurl;
          if (this.isYouTubeCutIn) {
            cutIn.height = Math.floor((cutIn.width * cutIn.defVideoSizeHeight) / cutIn.defVideoSizeWidth);
          } else {
            cutIn.height = Math.floor((cutIn.width * img.height) / img.width);
          }
        }
      }
    });
  }

  get cutInX_Pos(): number {
    if (!this.selectedCutIn) return 0;
    return this.isEditable ? this.selectedCutIn.x_pos : 0;
  }
  set cutInX_Pos(cutInX_Pos: number) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.x_pos = cutInX_Pos;
  }

  get cutInY_Pos(): number {
    if (!this.selectedCutIn) return 0;
    return this.isEditable ? this.selectedCutIn.y_pos : 0;
  }
  set cutInY_Pos(cutInY_Pos: number) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.y_pos = cutInY_Pos;
  }

  get cutInOriginalSize(): boolean {
    if (!this.selectedCutIn) return false;
    return this.isEditable ? this.selectedCutIn.originalSize : false;
  }
  set cutInOriginalSize(cutInOriginalSize: boolean) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.originalSize = cutInOriginalSize;
  }

  get cutInIsLoop(): boolean {
    if (!this.selectedCutIn) return false;
    return this.isEditable ? this.selectedCutIn.isLoop : false;
  }
  set cutInIsLoop(cutInIsLoop: boolean) {
    if (this.isEditable && this.selectedCutIn) {
      this.selectedCutIn.isLoop = cutInIsLoop;
      if (cutInIsLoop) this.selectedCutIn.outTime = 0;
    }
  }

  get chatActivate(): boolean {
    if (!this.selectedCutIn) return false;
    return this.isEditable ? this.selectedCutIn.chatActivate : false;
  }
  set chatActivate(chatActivate: boolean) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.chatActivate = chatActivate;
  }

  get cutInOutTime(): number {
    if (!this.selectedCutIn) return 0;
    return this.isEditable ? this.selectedCutIn.outTime : 0;
  }
  set cutInOutTime(cutInOutTime: number) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.outTime = cutInOutTime;
  }

  get cutInIsVideo(): boolean {
    if (!this.selectedCutIn) return false;
    return this.isEditable ? this.selectedCutIn.isVideoCutIn : false;
  }
  set cutInIsVideo(isVideo: boolean) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.isVideoCutIn = isVideo;
  }

  get cutInVideoURL(): string {
    if (!this.selectedCutIn) return '';
    return this.isEditable ? this.selectedCutIn.videoUrl : '';
  }
  set cutInVideoURL(videoUrl: string) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.videoUrl = videoUrl;
  }

  get cutInTagName(): string {
    if (!this.selectedCutIn) return '';
    return this.isEditable ? this.selectedCutIn.tagName : '';
  }
  set cutInTagName(cutInTagName: string) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.tagName = cutInTagName;
  }

  get cutInAudioName(): string {
    if (!this.selectedCutIn) return '';
    return this.isEditable ? this.selectedCutIn.audioName : '';
  }
  set cutInAudioName(cutInAudioName: string) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.audioName = cutInAudioName;
  }

  get cutInAudioIdentifier(): string {
    if (!this.selectedCutIn) return '';
    return this.isEditable ? this.selectedCutIn.audioIdentifier : '';
  }
  set cutInAudioIdentifier(cutInAudioIdentifier: string) {
    if (this.isEditable && this.selectedCutIn) this.selectedCutIn.audioIdentifier = cutInAudioIdentifier;
  }

  get audios(): AudioFile[] {
    return this.audioStorage.audios.filter((audio) => !audio.isHidden);
  }

  get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox');
  }

  get cutInImage(): ImageFile {
    if (!this.selectedCutIn) return ImageFile.Empty;
    const file = this.imageStorage.get(this.selectedCutIn.imageIdentifier);
    return file ? file : ImageFile.Empty;
  }

  private lazyUpdateTimer: NodeJS.Timeout = null!;
  selectedCutIn: CutIn | null = null;
  isYouTubeCutIn = false;

  get isSelected(): boolean {
    return this.selectedCutIn ? true : false;
  }
  get isEditable(): boolean {
    return !this.isEmpty && this.isSelected;
  }

  get isEmpty(): boolean {
    return this.getCutIns().length <= 0;
  }

  get cutInImageUrl(): string {
    if (!this.selectedCutIn) return ImageFile.Empty.url;
    return !this.selectedCutIn.videoId
      ? this.cutInImage.url
      : `https://img.youtube.com/vi/${this.selectedCutIn.videoId}/hqdefault.jpg`;
  }

  isSaveing = false;
  progresPercent = 0;

  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'カットインリスト'));
  }

  ngOnDestroy() {}

  selectCutIn(identifier: string) {
    this.selectedCutIn = this.objectStore.get<CutIn>(identifier);
    this.isYouTubeCutIn = this.selectedCutIn?.videoId ? true : false;
  }

  getCutIns(): CutIn[] {
    return this.objectStore.getObjects(CutIn);
  }

  createCutIn() {
    const cutIn = new CutIn();
    cutIn.name = '未設定のカットイン';
    cutIn.imageIdentifier = 'testTableBackgroundImage_image';
    cutIn.initialize();
    this.selectCutIn(cutIn.identifier);
  }

  async save() {
    if (!this.selectedCutIn) return;
    this.isSaveing = true;
    this.progresPercent = 0;

    this.selectedCutIn.selected = true;
    const fileName: string = 'cut_' + this.selectedCutIn.name;

    await this.saveDataService.saveGameObjectAsync(this.selectedCutIn, fileName, (percent) => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  delete() {
    if (!this.isEmpty && this.selectedCutIn) {
      this.selectedCutIn.destroy();
      this.selectedCutIn = null;
    }
  }

  openCutInImageModal() {
    if (!this.isSelected) return;
    this.modalService.open<string>(FileSelecterComponent).then((value) => {
      if (!this.selectedCutIn || !value) return;
      this.selectedCutIn.imageIdentifier = value;
    });
  }

  openCutInBgmModal() {
    if (!this.isSelected) return;
    this.modalService.open<string>(CutInBgmComponent).then((value) => {
      if (!this.selectedCutIn || !value) return;

      this.cutInAudioIdentifier = value;

      const audio = this.audioStorage.get(value);
      if (audio) {
        this.cutInAudioName = audio.name;
      }
    });
  }

  isCutInBgmUploaded() {
    if (!this.isSelected) return false;

    const audio = this.audioStorage.get(this.cutInAudioIdentifier);
    return audio ? true : false;
  }

  stoppreviewCutIn() {
    // jukuと同じにする
  }

  originalImgWidth() {
    if (!this.isSelected) return 0;
    if (!this.selectedCutIn) return 0;
    if (!this.selectedCutIn.cutInImage) return 0;

    const imageurl = this.selectedCutIn.cutInImage.url;
    if (imageurl.length > 0) {
      const img = new Image();
      img.src = imageurl;
      return img.width;
    }
    return 0;
  }

  originalImgHeight() {
    if (!this.isSelected) return 0;
    if (!this.selectedCutIn) return 0;
    if (!this.selectedCutIn.cutInImage) return 0;

    const imageurl = this.selectedCutIn.cutInImage.url;
    if (imageurl.length > 0) {
      const img = new Image();
      img.src = imageurl;
      return img.height;
    }
    return 0;
  }

  openYouTubeTerms() {
    this.modalService.open(OpenUrlComponent, {
      url: 'https://www.youtube.com/terms',
      title: 'YouTube 利用規約',
    });
    return false;
  }

  changeYouTubeInfo() {
    if (!this.selectedCutIn) return;
    const isVideo = this.selectedCutIn.videoId ? true : false;
    if ((!this.isYouTubeCutIn && isVideo) || (this.isYouTubeCutIn && !isVideo)) {
      this.setDefaultControl(isVideo);
    }
    this.isYouTubeCutIn = isVideo;
  }

  get minSizeWidth() {
    if (this.selectedCutIn) {
      this._minSizeWidth = this.selectedCutIn.minSizeWidth(this.isYouTubeCutIn);
    }
    return this._minSizeWidth;
  }

  get maxSizeWidth() {
    if (this.selectedCutIn) {
      this._maxSizeWidth = this.selectedCutIn.maxSizeWidth(this.isYouTubeCutIn);
    }
    return this._maxSizeWidth;
  }

  get minSizeHeight() {
    if (this.selectedCutIn) {
      this._minSizeHeight = this.selectedCutIn.minSizeHeight(this.isYouTubeCutIn);
    }
    return this._minSizeHeight;
  }

  get maxSizeHeight() {
    if (this.selectedCutIn) {
      this._maxSizeHeight = this.selectedCutIn.maxSizeHeight(this.isYouTubeCutIn);
    }
    return this._maxSizeHeight;
  }

  setDefaultControl(isVideo: boolean) {
    if (!this.isEditable) return 0;
    if (!this.selectedCutIn) return 0;
    /*
    this.minSizeWidth = this.selectedCutIn.minSizeWidth(isVideo);
    this.maxSizeWidth = this.selectedCutIn.maxSizeWidth(isVideo);
    this.minSizeHeight = this.selectedCutIn.minSizeHeight(isVideo);
    this.maxSizeHeight = this.selectedCutIn.maxSizeHeight(isVideo);
*/
    if (isVideo) {
      this.selectedCutIn.width = this.selectedCutIn.defVideoSizeWidth;
      this.selectedCutIn.height = this.selectedCutIn.defVideoSizeHeight;
    } else {
      this.selectedCutIn.width = this.originalImgWidth();
      this.selectedCutIn.height = this.originalImgHeight();
    }
  }

  previewCutIn() {
    if (!this.selectedCutIn) return;
    if (this.selectedCutIn.originalSize) {
      const imageurl = this.selectedCutIn.cutInImage.url;
      if (imageurl.length > 0) {
        const img = new Image();
        img.src = imageurl;
        this.selectedCutIn.width = this.originalImgWidth();
        this.selectedCutIn.height = this.originalImgHeight();
      }
    }
    // プレビューではジューク音楽の停止をしない
    this.cutInLauncher.startCutInMySelf(this.selectedCutIn);
  }

  playCutIn() {
    if (!this.selectedCutIn) return;
    if (this.selectedCutIn.originalSize) {
      const imageurl = this.selectedCutIn.cutInImage.url;
      if (imageurl.length > 0) {
        const img = new Image();
        img.src = imageurl;
        this.selectedCutIn.width = this.originalImgWidth();
        this.selectedCutIn.height = this.originalImgHeight();
      }
    }

    // 同名タグが再生中の場合そのタグのカットインを停止してから生成
    // 無タグ、かつ音楽が指定されている場合　jukebox　を停止する
    // タグ名有りの場合、音楽が設定されていない場合　jukebox　は停止しない
    if (this.isCutInBgmUploaded() && this.cutInTagName == '') {
      this.jukebox.stop();
    }

    this.cutInLauncher.startCutIn(this.selectedCutIn);
  }

  stopCutIn() {
    if (!this.selectedCutIn) return;
    this.cutInLauncher.stopCutIn(this.selectedCutIn);
  }
}
