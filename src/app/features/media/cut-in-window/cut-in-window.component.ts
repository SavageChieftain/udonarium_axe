import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { YouTubePlayer } from '@angular/youtube-player';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/Jukebox';
import { Config } from '@axe/domain/peer/config';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cut-in-window',
  templateUrl: './cut-in-window.component.html',
  styleUrls: ['./cut-in-window.component.css'],
  imports: [YouTubePlayer, SafePipe],
})
export class CutInWindowComponent implements AfterViewInit, OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private objectStore = inject(ObjectStore);
  private audioStorage = inject(AudioStorage);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  readonly cutInArea = viewChild<ElementRef<HTMLDivElement>>('cutInArea');
  readonly videoPlayer = viewChild<YouTubePlayer>('videoPlayerComponent');

  left = 0;
  top = 0;
  width = 200;
  height = 150;

  readonly audioPlayer: AudioPlayer = new AudioPlayer();
  private cutInTimeOut: ReturnType<typeof setTimeout> | null = null;
  timerCheckWindowSize: ReturnType<typeof setTimeout> | null = null;

  private _videoId = '';
  private _timeoutIdVideo: ReturnType<typeof setTimeout> | null = null;

  videoStateTransition = false;

  isTest = false;

  cutIn: CutIn = null!;
  playListId = '';

  private _naturalWidth = 0;
  private _naturalHeight = 0;

  get audios(): AudioFile[] {
    return this.audioStorage.audios.filter((audio) => !audio.isHidden);
  }
  get cutInLauncher(): CutInLauncher {
    return this.objectStore.get<CutInLauncher>('CutInLauncher');
  }
  get jukebox(): Jukebox {
    return this.objectStore.get<Jukebox>('Jukebox');
  }
  get config(): Config {
    return this.objectStore.get<Config>('Config');
  }

  getCutIns(): CutIn[] {
    return this.objectStore.getObjects(CutIn);
  }

  startCutIn() {
    if (!this.cutIn) return;

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

  ngOnInit() {
    this.objectChange.startCutIn$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      const cutIn = event.cutIn as CutIn;
      if (this.cutIn) {
        if (this.cutIn.identifier == cutIn.identifier || this.cutIn.tagName == cutIn.tagName) {
          this.panelService.close();
        }
      }
    });
    this.objectChange.stopCutInByBgm$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.cutIn) {
        const audio = this.audioStorage.get(this.cutIn.audioIdentifier);
        if (this.cutIn.tagName == '' && audio) {
          this.panelService.close();
        }
      }
    });
    this.objectChange.stopCutIn$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      const cutIn = event.cutIn as CutIn;
      if (this.cutIn) {
        if (this.cutIn.identifier == cutIn.identifier) {
          this.panelService.close();
        }
      }
    });
  }

  ngAfterViewInit() {
    if (this.cutIn) {
      setTimeout(() => {
        this.moveCutInPos();
      }, 0);
    }
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
    if (this.videoId) {
      if (this.panelService.width < this.cutIn.minSizeWidth(true)) {
        this.panelService.width = this.cutIn.minSizeWidth(true);
      }
      if (this.panelService.height < this.cutIn.minSizeHeight(true)) {
        this.panelService.height = this.cutIn.minSizeHeight(true);
      }
    }
  }

  get videoId(): string {
    if (!this.cutIn) return '';
    if (this._videoId == '') this._videoId = this.cutIn.videoId; // 再生後の切り替えを受け付けないようにする
    return this._videoId;
  }

  get isVisible(): string {
    return this._videoId ? 'visible' : 'hidden';
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
        this._timeoutIdVideo = null!;
      }, 200);
    }
    if (state == 2) {
      this.videoStateTransition = true;
      this._timeoutIdVideo = setTimeout(() => {
        this.videoStateTransition = false;
        this._timeoutIdVideo = null!;
      }, 200);
    }
    if (state == 5) {
      this.videoStateTransition = true;
      this._timeoutIdVideo = setTimeout(() => {
        this.videoStateTransition = false;
        this._timeoutIdVideo = null!;
      }, 200);
    }
    if (state == 0) {
      // 動画終了時：ループ設定なら先頭から再生し直す
      if (this.cutIn?.isLoop && $event.target?.seekTo && $event.target?.playVideo) {
        const startSec = this.cutIn.videoStart ? +this.cutIn.videoStart : 0;
        $event.target.seekTo(startSec, true);
        $event.target.playVideo();
      } else {
        this.cutInTimeOut = null!;
        this.panelService.close();
      }
    }
  }

  onErrorFallback() {
    if (!this.videoId) return;
    // 後で修正
    // this.cutInImageElement.nativeElement.src = 'https://img.youtube.com/vi/' + this.videoId + '/default.jpg'
  }

  ngOnDestroy() {
    if (this.cutInTimeOut) {
      clearTimeout(this.cutInTimeOut);
      this.cutInTimeOut = null!;
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
  }
}
