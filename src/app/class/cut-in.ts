import { ImageFile } from '@axe/core/file-storage/image-file';
import { ImageStorage } from '@axe/core/file-storage/image-storage';

import { AudioFile } from './core/file-storage/audio-file';
import { AudioPlayer } from './core/file-storage/audio-player';
import { AudioStorage } from './core/file-storage/audio-storage';
import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { GameObject } from './core/synchronize-object/game-object';

@SyncObject('cut-in')
export class CutIn extends GameObject {
  @SyncVar() name = 'カットイン';
  @SyncVar() width = 480;
  @SyncVar() height = 320;
  @SyncVar() originalSize = true;
  @SyncVar() x_pos = 50;
  @SyncVar() y_pos = 50;

  // 主にジュークボックス機能を参考に作成
  @SyncVar() imageIdentifier = 'imageIdentifier';
  @SyncVar() audioIdentifier = '';
  @SyncVar() audioName = '';
  @SyncVar() startTime = 0;
  @SyncVar() tagName = '';
  @SyncVar() selected = false;
  @SyncVar() isLoop = false;
  @SyncVar() chatActivate = false;

  @SyncVar() outTime = 0;

  @SyncVar() isPlaying = false;
  @SyncVar() keepImageAspect = false;

  @SyncVar() isVideoCutIn = false;
  @SyncVar() videoUrl = '';
  // 規約準拠のため常時falseに変更 ToDO 取り除く
  //  isSoundOnly: boolean = false;

  private normalMinSizeWidth = 10;
  private normalMinSizeHeight = 10;

  private normalMaxSizeWidth = 1200;
  private normalMaxSizeHeight = 1200;

  private videoMinSizeWidth = 448;
  private videoMinSizeHeight = 252;

  private videoMaxSizeWidth = 1920;
  private videoMaxSizeHeight = 1080;

  private _defVideoSizeWidth = 640;
  private _defVideoSizeHeight = 360;

  get defVideoSizeWidth(): number {
    return this._defVideoSizeWidth;
  }

  get defVideoSizeHeight(): number {
    return this._defVideoSizeHeight;
  }

  minSizeWidth(isVideo: boolean): number {
    if (isVideo) {
      return this.videoMinSizeWidth;
    } else {
      return this.normalMinSizeWidth;
    }
  }

  maxSizeWidth(isVideo: boolean): number {
    if (isVideo) {
      return this.videoMaxSizeWidth;
    } else {
      return this.normalMaxSizeWidth;
    }
  }

  minSizeHeight(isVideo: boolean): number {
    if (isVideo) {
      return this.videoMinSizeHeight;
    } else {
      return this.normalMinSizeHeight;
    }
  }

  maxSizeHeight(isVideo: boolean): number {
    if (isVideo) {
      return this.videoMaxSizeHeight;
    } else {
      return this.normalMaxSizeHeight;
    }
  }

  get audio(): AudioFile {
    return AudioStorage.instance.get(this.audioIdentifier);
  }
  private audioPlayer: AudioPlayer = new AudioPlayer();

  get cutInImage(): ImageFile {
    if (!this.imageIdentifier) {
      return ImageFile.Empty;
    }
    const file = ImageStorage.instance.get(this.imageIdentifier);
    return file ? file : ImageFile.Empty;
  }

  validUrl(url: string): boolean {
    if (!url) return false;
    try {
      new URL(url.trim());
    } catch (_e) {
      return false;
    }
    return /^https?:\/\//.test(url.trim());
  }

  get videoId(): string {
    if (!this.isVideoCutIn || !this.videoUrl) return '';
    let ret = '';
    if (this.validUrl(this.videoUrl)) {
      const hostname = new URL(this.videoUrl).hostname;
      if (hostname == 'youtube.com' || hostname == 'www.youtube.com') {
        const tmp = this.videoUrl.split('v=');
        if (tmp[1]) ret = encodeURI(tmp[1].split(/[?&#/]/)[0]);
      } else if (hostname == 'youtu.be') {
        const tmp = this.videoUrl.split('youtu.be/');
        if (tmp[1]) ret = encodeURI(tmp[1].split(/[?&#/]/)[0]);
      } else {
        return '';
      }
    } else {
      // IDだけを許可すべきか？
      return '';
    }
    return ret.replace(/[<>/:\s\r\n]/g, '');
  }

  get videoStart(): string {
    if (!this.isVideoCutIn || !this.videoUrl || !this.videoId) return null!;
    const result = /[&?](?:start|t)=([\dhms]+)/i.exec(this.videoUrl);
    if (result && result[1]) {
      return this._sec(result[1]);
    }
    return null!;
  }

  private _sec(str: string): string {
    if (!str) return null!;
    let tmp: RegExpExecArray | null;
    if ((tmp = /^(\d+)$/.exec(str))) {
      return tmp[1];
    } else if ((tmp = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(str))) {
      let sec = 0;
      if (tmp[1]) sec += +tmp[1] * 60 * 60;
      if (tmp[2]) sec += +tmp[2] * 60;
      if (tmp[3]) sec += +tmp[3];
      return `${sec}`;
    }
    return null!;
  }

  get playListId(): string {
    if (!this.isVideoCutIn || !this.videoId) return '';
    let ret = '';
    if (this.validUrl(this.videoUrl)) {
      const tmp = this.videoUrl.split('list=');
      if (tmp[1]) ret = encodeURI(tmp[1].split(/[&#/]/)[0]);
    } else {
      return '';
    }
    return ret.replace(/[<>/:\s\r\n]/g, '');
  }

  get isValidAudio(): boolean {
    return (
      this.audioName.length == 0 ||
      this.audioIdentifier.length == 0 ||
      !!AudioStorage.instance.get(this.audioIdentifier)
    );
  }
}
