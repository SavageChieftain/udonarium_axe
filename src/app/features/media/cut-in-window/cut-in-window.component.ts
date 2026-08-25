import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { type CutInSoundHandle, CutInSoundService } from '@axe/application/media/cut-in-sound.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { CutIn, cutInPanelChrome } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { CutInLayer } from '@axe/domain/media/cut-in-layer';
import { cutInPlaybackMs } from '@axe/domain/media/cut-in-playback-window';
import { CutInScene } from '@axe/domain/media/cut-in-scene';
import { CutInStageComponent } from '@axe/features/media/cut-in-stage/cut-in-stage.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cut-in-window',
  templateUrl: './cut-in-window.component.html',
  imports: [YouTubePlayer, SafePipe, CutInStageComponent],
})
export class CutInWindowComponent {
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly audioStorage = inject(AudioStorage);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly cutInSound = inject(CutInSoundService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cutInArea = viewChild<ElementRef<HTMLDivElement>>('cutInArea');
  readonly videoPlayer = viewChild<YouTubePlayer>('videoPlayerComponent');

  left = 0;
  top = 0;
  width = 200;
  height = 150;

  readonly audioPlayer: AudioPlayer = new AudioPlayer();
  /** This window's own scene sounds, so closing it says nothing about anyone else's. */
  private sceneSound: CutInSoundHandle | null = null;
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
    effect(() => {
      const vol = this.videoVolumeSig();
      this.videoPlayer()?.setVolume(vol);
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

  /** The layers this cut-in is built from, if it is built from any. */
  readonly scene = computed<CutInScene | null>(() => {
    if (!this.cutIn) return null;
    this.objectChange.collectionOf(CutInScene.aliasName)();
    this.objectChange.collectionOf(CutInLayer.aliasName)();
    const scene = this.cutIn.scene;
    return scene && scene.layers.length > 0 ? scene : null;
  });

  readonly cutInImageUrl = computed(() => {
    this.objectChange.fileVersion();
    if (!this.cutIn) return ImageFile.Empty.url;
    this.objectChange.versionOf(this.cutIn.identifier)();
    if (this.cutIn.videoId) return '';
    const file = this.imageStorage.get(this.cutIn.imageIdentifier);
    return file?.url ?? ImageFile.Empty.url;
  });
  get cutInLauncher(): CutInLauncher {
    return this.objectStore.get<CutInLauncher>('CutInLauncher')!;
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
      const isSE = AudioTag.get(this.cutIn.audioIdentifier)?.tag === 'SE';
      this.audioPlayer.volumeType = isSE ? VolumeType.SE : VolumeType.MASTER;
      this.audioPlayer.loop = this.cutIn.isLoop;
      if (!this.cutIn.videoId) {
        this.audioPlayer.play(audio);
      }
    }

    const scene = this.cutIn.scene;
    if (scene && scene.layers.length > 0) this.sceneSound = this.cutInSound.play(scene, 0, scene.sceneLoop);

    const playbackMs = cutInPlaybackMs(this.cutIn, this.cutIn.scene);
    if (playbackMs > 0) {
      this.cutInTimeOut = setTimeout(() => {
        this.cutInTimeOut = null;
        this.panelService.close();
      }, playbackMs);
    }
  }

  stopCutIn() {
    this.audioPlayer.stop();
    this.sceneSound?.stop();
    this.sceneSound = null;
  }

  moveCutInPos() {
    if (this.cutIn) {
      const chrome = cutInPanelChrome(this.cutIn);
      const cutin_w = this.cutIn.width;
      const cutin_h = this.cutIn.height;
      let margin_w = window.innerWidth - cutin_w;
      let margin_h = window.innerHeight - cutin_h - chrome;
      if (margin_w < 0) margin_w = 0;
      if (margin_h < 0) margin_h = 0;
      const margin_x = (margin_w * this.cutIn.x_pos) / 100;
      const margin_y = (margin_h * this.cutIn.y_pos) / 100;

      this.width = cutin_w;
      this.height = cutin_h + chrome;
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

  readonly videoVolumeSig = computed(() => {
    if (this.cutIn) this.objectChange.versionOf(this.cutIn.identifier)();
    return this.cutIn?.videoVolume ?? 50;
  });

  get videoVolume(): number {
    return this.videoVolumeSig();
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
  }
}
