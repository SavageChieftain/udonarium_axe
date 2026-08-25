import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';
import { CutInBgmComponent } from '@axe/features/media/cut-in-bgm/cut-in-bgm.component';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { OpenUrlComponent } from '@axe/ui/components/open-url/open-url.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cut-in-editor',
  templateUrl: './cut-in-editor.component.html',
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class CutInEditorComponent {
  private readonly modalService = inject(ModalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);
  private readonly audioStorage = inject(AudioStorage);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly t = inject(TRANSLATE_FN);

  readonly cutIn = input<CutIn | null>(null);
  readonly isEditable = input(false);

  readonly isYouTubeCutIn = signal(false);

  _minSizeWidth = 10;
  _maxSizeWidth = 10;
  _minSizeHeight = 1200;
  _maxSizeHeight = 1200;

  private get c(): CutIn | null {
    return this.cutIn();
  }

  private get editable(): boolean {
    return this.isEditable();
  }

  readonly cutInImage = computed(() => {
    this.objectChange.fileVersion();
    const c = this.cutIn();
    if (!c) return ImageFile.Empty;
    this.objectChange.versionOf(c.identifier)();
    const file = this.imageStorage.get(c.imageIdentifier);
    return file ? file : ImageFile.Empty;
  });

  readonly cutInImageUrl = computed(() => {
    const c = this.cutIn();
    if (!c) return ImageFile.Empty.url;
    this.objectChange.versionOf(c.identifier)();
    return !c.videoId ? this.cutInImage().url : `https://img.youtube.com/vi/${c.videoId}/hqdefault.jpg`;
  });

  get cutInName(): string {
    if (!this.c) return '';
    return this.editable ? this.c.name : '';
  }
  set cutInName(cutInName: string) {
    if (this.editable && this.c) this.c.name = cutInName;
  }

  set cutInWidth(cutInWidth: number) {
    if (!this.c) return;
    if (this.editable) this.c.width = cutInWidth;
    if (this.keepImageAspect) {
      if (this.isYouTubeCutIn()) {
        this.c.height = Math.floor((cutInWidth * this.c.defVideoSizeHeight) / this.c.defVideoSizeWidth);
      } else {
        this.c.height = Math.floor((cutInWidth * this.originalImgHeight()) / this.originalImgWidth());
      }
    }
  }

  get cutInWidth(): number {
    if (!this.editable || !this.c) return 0;
    if (this.cutInOriginalSize) {
      if (this.isYouTubeCutIn()) {
        const width = this.c.defVideoSizeWidth;
        if (this.c.width !== width) this.c.width = width;
      } else {
        const width = this.cutInImage().url ? this.originalImgWidth() : 0;
        if (width > 0 && this.c.width !== width) this.c.width = width;
      }
    }
    return this.c.width;
  }

  set cutInHeight(cutInHeight: number) {
    if (!this.c) return;
    if (this.editable) this.c.height = cutInHeight;
    if (this.keepImageAspect) {
      if (this.isYouTubeCutIn()) {
        this.c.width = Math.floor((cutInHeight * this.c.defVideoSizeWidth) / this.c.defVideoSizeHeight);
      } else {
        this.c.width = Math.floor((cutInHeight * this.originalImgWidth()) / this.originalImgHeight());
      }
    }
  }

  get cutInHeight(): number {
    if (!this.editable || !this.c) return 0;
    if (this.cutInOriginalSize) {
      if (this.isYouTubeCutIn()) {
        const height = this.c.defVideoSizeHeight;
        if (this.c.height !== height) this.c.height = height;
      } else {
        const height = this.cutInImage().url ? this.originalImgHeight() : 0;
        if (height > 0 && this.c.height !== height) this.c.height = height;
      }
    }
    return this.c.height;
  }

  get keepImageAspect(): boolean {
    if (!this.editable || !this.c) return false;
    return this.c.keepImageAspect;
  }
  set keepImageAspect(aspect: boolean) {
    if (!this.editable || !this.c) return;
    this.c.keepImageAspect = aspect;
  }

  get cutInFrameless(): boolean {
    if (!this.c) return false;
    return this.editable ? this.c.frameless : false;
  }
  set cutInFrameless(frameless: boolean) {
    if (this.editable && this.c) this.c.frameless = frameless;
  }

  get cutInOriginalSize(): boolean {
    if (!this.c) return false;
    return this.editable ? this.c.originalSize : false;
  }
  set cutInOriginalSize(cutInOriginalSize: boolean) {
    if (this.editable && this.c) this.c.originalSize = cutInOriginalSize;
  }

  get cutInX_Pos(): number {
    if (!this.c) return 0;
    return this.editable ? this.c.x_pos : 0;
  }
  set cutInX_Pos(cutInX_Pos: number) {
    if (this.editable && this.c) this.c.x_pos = cutInX_Pos;
  }

  get cutInY_Pos(): number {
    if (!this.c) return 0;
    return this.editable ? this.c.y_pos : 0;
  }
  set cutInY_Pos(cutInY_Pos: number) {
    if (this.editable && this.c) this.c.y_pos = cutInY_Pos;
  }

  get cutInIsLoop(): boolean {
    if (!this.c) return false;
    return this.editable ? this.c.isLoop : false;
  }
  set cutInIsLoop(cutInIsLoop: boolean) {
    if (this.editable && this.c) {
      this.c.isLoop = cutInIsLoop;
      if (cutInIsLoop) this.c.outTime = 0;
    }
  }

  get cutInOutTime(): number {
    if (!this.c) return 0;
    return this.editable ? this.c.outTime : 0;
  }
  set cutInOutTime(cutInOutTime: number) {
    if (this.editable && this.c) this.c.outTime = cutInOutTime;
  }

  get chatActivate(): boolean {
    if (!this.c) return false;
    return this.editable ? this.c.chatActivate : false;
  }
  set chatActivate(chatActivate: boolean) {
    if (this.editable && this.c) this.c.chatActivate = chatActivate;
  }

  get cutInIsVideo(): boolean {
    if (!this.c) return false;
    return this.editable ? this.c.isVideoCutIn : false;
  }
  set cutInIsVideo(isVideo: boolean) {
    if (this.editable && this.c) this.c.isVideoCutIn = isVideo;
  }

  get cutInVideoURL(): string {
    if (!this.c) return '';
    return this.editable ? this.c.videoUrl : '';
  }
  set cutInVideoURL(videoUrl: string) {
    if (this.editable && this.c) this.c.videoUrl = videoUrl;
  }

  get cutInVideoVolume(): number {
    if (!this.c) return 100;
    return this.editable ? this.c.videoVolume : 100;
  }
  set cutInVideoVolume(videoVolume: number) {
    if (this.editable && this.c) this.c.videoVolume = this.normalizeVideoVolume(videoVolume);
  }

  get cutInTagName(): string {
    if (!this.c) return '';
    return this.editable ? this.c.tagName : '';
  }
  set cutInTagName(cutInTagName: string) {
    if (this.editable && this.c) this.c.tagName = cutInTagName;
  }

  get cutInAudioName(): string {
    if (!this.c) return '';
    return this.editable ? this.c.audioName : '';
  }
  set cutInAudioName(cutInAudioName: string) {
    if (this.editable && this.c) this.c.audioName = cutInAudioName;
  }

  get cutInAudioIdentifier(): string {
    if (!this.c) return '';
    return this.editable ? this.c.audioIdentifier : '';
  }
  set cutInAudioIdentifier(cutInAudioIdentifier: string) {
    if (this.editable && this.c) this.c.audioIdentifier = cutInAudioIdentifier;
  }

  readonly audios = computed(() => {
    this.objectChange.fileVersion();
    return this.audioStorage.audios.filter((audio) => !audio.isHidden);
  });

  get minSizeWidth(): number {
    if (this.c) this._minSizeWidth = this.c.minSizeWidth(this.isYouTubeCutIn());
    return this._minSizeWidth;
  }

  get maxSizeWidth(): number {
    if (this.c) this._maxSizeWidth = this.c.maxSizeWidth(this.isYouTubeCutIn());
    return this._maxSizeWidth;
  }

  get minSizeHeight(): number {
    if (this.c) this._minSizeHeight = this.c.minSizeHeight(this.isYouTubeCutIn());
    return this._minSizeHeight;
  }

  get maxSizeHeight(): number {
    if (this.c) this._maxSizeHeight = this.c.maxSizeHeight(this.isYouTubeCutIn());
    return this._maxSizeHeight;
  }

  isCutInBgmUploaded(): boolean {
    if (!this.c) return false;
    return this.audioStorage.get(this.cutInAudioIdentifier) !== null;
  }

  chkImageAspect() {
    if (!this.editable || !this.c) return;
    const cutIn = this.c;
    setTimeout(() => {
      if (this.keepImageAspect) {
        const imageurl = this.cutInImage().url;
        if (imageurl.length > 0) {
          const img = new Image();
          img.src = imageurl;
          if (this.isYouTubeCutIn()) {
            cutIn.height = Math.floor((cutIn.width * cutIn.defVideoSizeHeight) / cutIn.defVideoSizeWidth);
          } else {
            cutIn.height = Math.floor((cutIn.width * img.height) / img.width);
          }
        }
      }
    });
  }

  changeYouTubeInfo() {
    if (!this.c) return;
    const isVideo = !!this.c.videoId;
    if ((!this.isYouTubeCutIn() && isVideo) || (this.isYouTubeCutIn() && !isVideo)) {
      this.setDefaultControl(isVideo);
    }
    this.isYouTubeCutIn.set(isVideo);
  }

  setDefaultControl(isVideo: boolean) {
    if (!this.editable || !this.c) return;
    if (isVideo) {
      this.c.width = this.c.defVideoSizeWidth;
      this.c.height = this.c.defVideoSizeHeight;
    } else {
      this.c.width = this.originalImgWidth();
      this.c.height = this.originalImgHeight();
    }
  }

  originalImgWidth(): number {
    const imageurl = this.cutInImage().url;
    if (imageurl.length > 0) {
      const img = new Image();
      img.src = imageurl;
      return img.width;
    }
    return 0;
  }

  originalImgHeight(): number {
    const imageurl = this.cutInImage().url;
    if (imageurl.length > 0) {
      const img = new Image();
      img.src = imageurl;
      return img.height;
    }
    return 0;
  }

  previewCutIn() {
    if (!this.c) return;
    if (this.c.originalSize) {
      const imageurl = this.cutInImage().url;
      if (imageurl.length > 0) {
        this.c.width = this.originalImgWidth();
        this.c.height = this.originalImgHeight();
      }
    }
    this.cutInLauncher.startCutInMySelf(this.c);
  }

  playCutIn() {
    if (!this.c) return;
    if (this.c.originalSize) {
      const imageurl = this.cutInImage().url;
      if (imageurl.length > 0) {
        this.c.width = this.originalImgWidth();
        this.c.height = this.originalImgHeight();
      }
    }
    if (this.isCutInBgmUploaded() && this.cutInTagName === '') {
      this.jukebox.stop();
    }
    this.cutInLauncher.startCutIn(this.c);
  }

  stopCutIn() {
    if (this.c) this.cutInLauncher.stopCutIn(this.c);
  }

  openCutInImageModal() {
    if (!this.c) return;
    const cutIn = this.c;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((value) => {
      if (!cutIn || value === undefined || value === null) return;
      cutIn.imageIdentifier = value;
    });
  }

  openCutInBgmModal() {
    if (!this.c) return;
    this.modalService.open<string>(CutInBgmComponent).then((value) => {
      if (!this.c || !value) return;
      this.cutInAudioIdentifier = value;
      const audio = this.audioStorage.get(value);
      if (audio) this.cutInAudioName = audio.name;
    });
  }

  openYouTubeTerms() {
    this.modalService.open(OpenUrlComponent, {
      url: 'https://www.youtube.com/terms',
      title: this.t('feature.media.cutIn.youtubeTerms'),
    });
    return false;
  }

  private normalizeVideoVolume(videoVolume: number): number {
    const volume = Number(videoVolume);
    if (!Number.isFinite(volume)) return 50;
    return Math.min(100, Math.max(0, Math.round(volume)));
  }

  private get cutInLauncher(): CutInLauncher {
    return this.objectStore.get<CutInLauncher>('CutInLauncher')!;
  }

  private get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox')!;
  }
}
