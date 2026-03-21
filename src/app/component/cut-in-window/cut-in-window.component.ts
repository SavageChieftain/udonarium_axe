import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { AudioFile } from '@axe/core/file-storage/audio-file';
import { YouTubePlayer } from '@angular/youtube-player';
import { AudioPlayer } from '@axe/core/file-storage/audio-player';
import { AudioStorage } from '@axe/core/file-storage/audio-storage';

import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem } from '@axe/core/system';
import { CutIn } from '@axe/cut-in';
import { CutInLauncher } from '@axe/cut-in-launcher';

import { Jukebox } from '@axe/Jukebox';
import { Config } from '@axe/config';

import { SafePipe } from 'pipe/safe.pipe';

@Component({
  selector: 'app-cut-in-window',
  templateUrl: './cut-in-window.component.html',
  styleUrls: ['./cut-in-window.component.css'],
  imports: [YouTubePlayer, SafePipe],
})
export class CutInWindowComponent implements AfterViewInit, OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private changeDetectionRef = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  // @ViewChild('cutInImageElement', { static: false }) cutInImageElement: ElementRef;
  @ViewChild('videoPlayerComponent', { static: false })
  videoPlayer!: YouTubePlayer;

  left = 0;
  top = 0;
  width = 200;
  height = 150;

  private lazyUpdateTimer: ReturnType<typeof setTimeout> | null = null;
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
    return AudioStorage.instance.audios.filter((audio) => !audio.isHidden);
  }
  get cutInLauncher(): CutInLauncher {
    return ObjectStore.instance.get<CutInLauncher>('CutInLauncher');
  }
  get jukebox(): Jukebox {
    return ObjectStore.instance.get<Jukebox>('Jukebox');
  }
  get config(): Config {
    return ObjectStore.instance.get<Config>('Config');
  }

  getCutIns(): CutIn[] {
    return ObjectStore.instance.getObjects(CutIn);
  }

  startCutIn() {
    if (!this.cutIn) return;
    console.log('CutInWin ' + this.cutIn.name);

    const audio = this.cutIn.audio;
    if (audio) {
      this.audioPlayer.loop = this.cutIn.isLoop;
      if (!this.cutIn.videoId) {
        this.audioPlayer.play(audio);
      }
    }

    if (this.cutIn.outTime > 0) {
      console.log('outTime ' + this.cutIn.outTime);

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
    EventSystem.register(this)
      .on('START_CUT_IN', (event) => {
        console.log('カットインウィンドウ>Event:START_CUT_IN ' + this.cutIn.name);
        if (this.cutIn) {
          if (this.cutIn.identifier == event.data.cutIn.identifier || this.cutIn.tagName == event.data.cutIn.tagName) {
            this.panelService.close();
          }
        }
      })
      .on('STOP_CUT_IN_BY_BGM', (_event) => {
        if (this.cutIn) {
          console.log(" 'STOP_CUT_IN_BY_BGM :" + this.cutIn);
          const audio = AudioStorage.instance.get(this.cutIn.audioIdentifier);
          if (this.cutIn.tagName == '' && audio) {
            this.panelService.close();
          }
        }
      })
      .on('STOP_CUT_IN', (event) => {
        console.log('カットインウィンドウ>Event: ' + this.cutIn.name);
        if (this.cutIn) {
          if (this.cutIn.identifier == event.data.cutIn.identifier) {
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
    } else {
      console.log('カットインが未定義で再生された');
    }
    this.panelService.width = this.width;
    this.panelService.height = this.height;
    this.panelService.left = this.left;
    this.panelService.top = this.top;
  }

  chkeWindowMinSize() {
    if (this.videoId) {
      console.log('chkeWindowMinSize 1:' + this.panelService.width);
      if (this.panelService.width < this.cutIn.minSizeWidth(true)) {
        this.panelService.width = this.cutIn.minSizeWidth(true);
      }
      if (this.panelService.height < this.cutIn.minSizeHeight(true)) {
        this.panelService.height = this.cutIn.minSizeHeight(true);
      }
      console.log('chkeWindowMinSize 2:' + this.panelService.width);
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

  get cutInAreaId(): string {
    if (!this.cutIn) {
      return '';
    } else {
      return this.cutIn.identifier + '_window';
    }
  }

  get youTubeWidth(): number {
    return document.getElementById(this.cutInAreaId) ? document.getElementById(this.cutInAreaId)!.clientWidth : 640;
  }

  get youTubeHeight(): number {
    return document.getElementById(this.cutInAreaId) ? document.getElementById(this.cutInAreaId)!.clientHeight : 340;
  }

  onPlayerReady($event: { target: { setVolume: (v: number) => void; playVideo: () => void } }) {
    $event.target.setVolume(this.videoVolume);
    console.log('ready');
    $event.target.playVideo();
  }

  onPlayerStateChange($event: { data: number }) {
    const state = $event.data;
    console.log($event.data);
    if (state == 1) {
      this.videoStateTransition = true;
      this._timeoutIdVideo = setTimeout(() => {
        this.ngZone.run(() => {
          this.videoStateTransition = false;
          this._timeoutIdVideo = null!;
        });
      }, 200);
    }
    if (state == 2) {
      this.videoStateTransition = true;
      this._timeoutIdVideo = setTimeout(() => {
        this.ngZone.run(() => {
          this.videoStateTransition = false;
          this._timeoutIdVideo = null!;
        });
      }, 200);
    }
    if (state == 5) {
      this.videoStateTransition = true;
      this._timeoutIdVideo = setTimeout(() => {
        this.ngZone.run(() => {
          this.videoStateTransition = false;
          this._timeoutIdVideo = null!;
        });
      }, 200);
    }
    if (state == 0) {
      this.cutInTimeOut = null!;
      this.panelService.close();
    }
  }

  onErrorFallback() {
    console.log('fallback');
    if (!this.videoId) return;
    // 後で修正
    // this.cutInImageElement.nativeElement.src = 'https://img.youtube.com/vi/' + this.videoId + '/default.jpg'
  }

  ngOnDestroy() {
    if (this.cutInTimeOut) {
      clearTimeout(this.cutInTimeOut);
      this.cutInTimeOut = null!;
    }
    this.stopCutIn();
    EventSystem.unregister(this);
  }

  private lazyNgZoneUpdate() {
    if (this.lazyUpdateTimer !== null) return;
    this.lazyUpdateTimer = setTimeout(() => {
      this.lazyUpdateTimer = null!;
      this.ngZone.run(() => {});
    }, 100);
  }
}
