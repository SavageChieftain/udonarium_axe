import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';
import { Config } from '@axe/domain/peer/config';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cut-in-window',
  templateUrl: './cut-in-window.component.html',
  imports: [YouTubePlayer, SafePipe],
})
export class CutInWindowComponent {
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly audioStorage = inject(AudioStorage);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cutInArea = viewChild<ElementRef<HTMLDivElement>>('cutInArea');
  readonly videoPlayer = viewChild<YouTubePlayer>('videoPlayerComponent');

  left = 0;
  top = 0;
  width = 200;
  height = 150;

  readonly audioPlayer: AudioPlayer = new AudioPlayer();
  private cutInTimeOut: ReturnType<typeof setTimeout> | null = null;
  timerCheckWindowSize: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.objectChange.startCutIn$.subscribe((event) => {
      const cutIn = event.cutIn as CutIn;
      if (this.cutIn) {
        if (this.cutIn.identifier == cutIn.identifier || this.cutIn.tagName == cutIn.tagName) {
          this.panelService.close();
        }
      }
    }, this.destroyRef);
    this.objectChange.soundOnlyCutIn$.subscribe((event) => {
      // invisible パネル（@指定の YouTube）: startCutIn$ の代わりにこちらで同タグ停止を担う
      const cutIn = event.cutIn as CutIn;
      if (this.cutIn && cutIn?.videoId) {
        if (this.cutIn.identifier == cutIn.identifier || this.cutIn.tagName == cutIn.tagName) {
          this.panelService.close();
        }
      }
    }, this.destroyRef);
    this.objectChange.stopCutInByBgm$.subscribe(() => {
      if (this.cutIn) {
        const audio = this.audioStorage.get(this.cutIn.audioIdentifier);
        if (this.cutIn.tagName == '' && audio) {
          this.panelService.close();
        }
      }
    }, this.destroyRef);
    this.objectChange.stopCutIn$.subscribe((event) => {
      const cutIn = event.cutIn as CutIn;
      if (this.cutIn) {
        if (this.cutIn.identifier == cutIn.identifier) {
          this.panelService.close();
        }
      }
    }, this.destroyRef);
    afterNextRender(() => {
      if (this.cutIn) {
        setTimeout(() => {
          this.moveCutInPos();
        }, 0);
      }
    });
    this.destroyRef.onDestroy(() => {
      if (this.cutInTimeOut) {
        clearTimeout(this.cutInTimeOut);
        this.cutInTimeOut = null;
      }
      if (this.timerCheckWindowSize) {
        clearTimeout(this.timerCheckWindowSize);
        this.timerCheckWindowSize = null;
      }
      if (this._timeoutIdVideo) {
        clearTimeout(this._timeoutIdVideo);
        this._timeoutIdVideo = null;
      }
      this.stopCutIn();
    });
  }

  private _videoId = '';
  private readonly _videoIdSig = signal('');
  private _timeoutIdVideo: ReturnType<typeof setTimeout> | null = null;

  /** videoId が確定したら youtube-player を表示する（signal ベースで確実にリアクティブ）。
   *  @指定の invisible パネルはパネルコンテナ側が visibility:hidden なので個別制御不要。 */
  /** videoId が確定したら youtube-player を表示する（signal ベースでリアクティブ）。
   *  invisible パネル（@指定）では panelService.invisible が true のため、
   *  子要素で 'visible' を上書きしないよう '' を返す。 */
  readonly isVisible = computed(() => {
    if (this.panelService.invisible) return '';
    return this._videoIdSig() !== '' ? 'visible' : 'hidden';
  });

  videoStateTransition = false;

  isTest = false;
  forceNoLoop = false;

  cutIn: CutIn | null = null;
  playListId = '';

  private _naturalWidth = 0;
  private _naturalHeight = 0;

  readonly audios = computed(() => {
    this.objectChange.fileVersion();
    return this.audioStorage.audios.filter((audio) => !audio.isHidden);
  });

  readonly cutInImageUrl = computed(() => {
    this.objectChange.fileVersion();
    if (!this.cutIn) return ImageFile.Empty.url;
    // imageIdentifier は @SyncVar → objectChanged$ で versionOf が bump される
    this.objectChange.versionOf(this.cutIn.identifier)();
    if (this.cutIn.videoId) return '';
    const file = this.imageStorage.get(this.cutIn.imageIdentifier);
    return file?.url ?? ImageFile.Empty.url;
  });
  get cutInLauncher(): CutInLauncher {
    return this.objectStore.get<CutInLauncher>('CutInLauncher')!;
  }
  get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox')!;
  }
  get config(): Config {
    return this.objectStore.get<Config>('Config')!;
  }

  getCutIns(): CutIn[] {
    return this.objectStore.getObjects(CutIn);
  }

  startCutIn() {
    if (!this.cutIn) return;

    if (this.cutIn.videoId) {
      this._videoId = this.cutIn.videoId;
      this._videoIdSig.set(this._videoId);
    }

    const audio = this.cutIn.audio;
    if (audio) {
      this.audioPlayer.loop = this.cutIn.isLoop;
      if (!this.cutIn.videoId) {
        this.audioPlayer.play(audio);
      }
    }

    if (this.cutIn.outTime > 0) {
      this.cutInTimeOut = setTimeout(() => {
        this.cutInTimeOut = null;
        this.panelService.close();
      }, this.cutIn.outTime * 1000);
    }
  }

  stopCutIn() {
    this.audioPlayer.stop();
  }

  moveCutInPos() {
    if (this.cutIn) {
      const cutin_w = this.cutIn.width;
      const cutin_h = this.cutIn.height;
      let margin_w = window.innerWidth - cutin_w;
      let margin_h = window.innerHeight - cutin_h - 25;
      if (margin_w < 0) margin_w = 0;
      if (margin_h < 0) margin_h = 0;
      const margin_x = (margin_w * this.cutIn.x_pos) / 100;
      const margin_y = (margin_h * this.cutIn.y_pos) / 100;

      this.width = cutin_w;
      this.height = cutin_h + 25;
      this.left = margin_x;
      this.top = margin_y;
    }
    this.panelService.width = this.width;
    this.panelService.height = this.height;
    this.panelService.left = this.left;
    this.panelService.top = this.top;
  }

  chkeWindowMinSize() {
    if (!this.cutIn || !this.videoId) return;
    if (this.panelService.width < this.cutIn.minSizeWidth(true)) {
      this.panelService.width = this.cutIn.minSizeWidth(true);
    }
    if (this.panelService.height < this.cutIn.minSizeHeight(true)) {
      this.panelService.height = this.cutIn.minSizeHeight(true);
    }
  }

  get videoId(): string {
    if (!this.cutIn) return '';
    if (this._videoId === '') this._videoId = this.cutIn.videoId;
    return this._videoId;
  }

  get videoVolume(): number {
    return (this.isTest ? this.jukebox.auditionVolume : this.jukebox.volume) * this.config.roomVolume * 100;
  }

  get youTubeWidth(): number {
    return this.cutInArea()?.nativeElement.clientWidth ?? 640;
  }

  get youTubeHeight(): number {
    return this.cutInArea()?.nativeElement.clientHeight ?? 340;
  }

  onPlayerReady($event: { target: { setVolume: (v: number) => void; playVideo: () => void } }) {
    $event.target.setVolume(this.videoVolume);
    $event.target.playVideo();
  }

  onPlayerStateChange($event: {
    data: number;
    target?: { seekTo?: (seconds: number, allowSeekAhead: boolean) => void; playVideo?: () => void };
  }) {
    const state = $event.data;
    if (state == 1) {
      this.videoStateTransition = true;
      this._timeoutIdVideo = setTimeout(() => {
        this.videoStateTransition = false;
        this._timeoutIdVideo = null;
      }, 200);
    }
    if (state == 2) {
      this.videoStateTransition = true;
      this._timeoutIdVideo = setTimeout(() => {
        this.videoStateTransition = false;
        this._timeoutIdVideo = null;
      }, 200);
    }
    if (state == 5) {
      this.videoStateTransition = true;
      this._timeoutIdVideo = setTimeout(() => {
        this.videoStateTransition = false;
        this._timeoutIdVideo = null;
      }, 200);
    }
    if (state == 0) {
      // 動画終了時：ループ設定なら先頭から再生し直す（@指定時はループ無効）
      if (!this.forceNoLoop && this.cutIn?.isLoop && $event.target?.seekTo && $event.target?.playVideo) {
        const startSec = this.cutIn.videoStart ? +this.cutIn.videoStart : 0;
        $event.target.seekTo(startSec, true);
        $event.target.playVideo();
      } else {
        this.cutInTimeOut = null;
        this.panelService.close();
      }
    }
  }

  onErrorFallback() {
    if (!this.videoId) return;
    // 後で修正
    // this.cutInImageElement.nativeElement.src = 'https://img.youtube.com/vi/' + this.videoId + '/default.jpg'
  }
}
