import { TestBed } from '@angular/core/testing';

import { ObjectStore } from './core/synchronize-object/object-store';
import { CutIn } from './cut-in';

describe('CutIn', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('SyncVar デフォルト値', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('name がデフォルト "カットイン"', () => {
      expect(cutIn.name).toBe('カットイン');
    });

    it('width がデフォルト 480', () => {
      expect(cutIn.width).toBe(480);
    });

    it('height がデフォルト 320', () => {
      expect(cutIn.height).toBe(320);
    });

    it('originalSize がデフォルト true', () => {
      expect(cutIn.originalSize).toBe(true);
    });

    it('x_pos がデフォルト 50', () => {
      expect(cutIn.x_pos).toBe(50);
    });

    it('y_pos がデフォルト 50', () => {
      expect(cutIn.y_pos).toBe(50);
    });

    it('isLoop がデフォルト false', () => {
      expect(cutIn.isLoop).toBe(false);
    });

    it('chatActivate がデフォルト false', () => {
      expect(cutIn.chatActivate).toBe(false);
    });

    it('isPlaying がデフォルト false', () => {
      expect(cutIn.isPlaying).toBe(false);
    });

    it('isVideoCutIn がデフォルト false', () => {
      expect(cutIn.isVideoCutIn).toBe(false);
    });

    it('videoUrl がデフォルト空文字', () => {
      expect(cutIn.videoUrl).toBe('');
    });
  });

  describe('minSize / maxSize', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('通常モードの最小幅は10', () => {
      expect(cutIn.minSizeWidth(false)).toBe(10);
    });

    it('通常モードの最大幅は1200', () => {
      expect(cutIn.maxSizeWidth(false)).toBe(1200);
    });

    it('ビデオモードの最小幅は448', () => {
      expect(cutIn.minSizeWidth(true)).toBe(448);
    });

    it('ビデオモードの最大幅は1920', () => {
      expect(cutIn.maxSizeWidth(true)).toBe(1920);
    });

    it('通常モードの最小高さは10', () => {
      expect(cutIn.minSizeHeight(false)).toBe(10);
    });

    it('ビデオモードの最小高さは252', () => {
      expect(cutIn.minSizeHeight(true)).toBe(252);
    });

    it('通常モードの最大高さは1200', () => {
      expect(cutIn.maxSizeHeight(false)).toBe(1200);
    });

    it('ビデオモードの最大高さは1080', () => {
      expect(cutIn.maxSizeHeight(true)).toBe(1080);
    });
  });

  describe('defVideoSize', () => {
    it('デフォルトビデオ幅は640', () => {
      const cutIn = new CutIn();
      cutIn.initialize();
      expect(cutIn.defVideoSizeWidth).toBe(640);
    });

    it('デフォルトビデオ高さは360', () => {
      const cutIn = new CutIn();
      cutIn.initialize();
      expect(cutIn.defVideoSizeHeight).toBe(360);
    });
  });

  describe('validUrl()', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('有効なhttpsのURLはtrueを返す', () => {
      expect(cutIn.validUrl('https://example.com')).toBe(true);
    });

    it('有効なhttpのURLはtrueを返す', () => {
      expect(cutIn.validUrl('http://example.com')).toBe(true);
    });

    it('空文字列はfalseを返す', () => {
      expect(cutIn.validUrl('')).toBe(false);
    });

    it('httpでないURLはfalseを返す', () => {
      expect(cutIn.validUrl('ftp://example.com')).toBe(false);
    });

    it('不正なURLはfalseを返す', () => {
      expect(cutIn.validUrl('not a url')).toBe(false);
    });
  });

  describe('videoId', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
    });

    it('isVideoCutInがfalseの場合空文字列を返す', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(cutIn.videoId).toBe('');
    });

    it('youtube.comのv=パラメータからIDを抽出する', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      expect(cutIn.videoId).toBe('dQw4w9WgXcQ');
    });

    it('youtu.be短縮URLからIDを抽出する', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = 'https://youtu.be/dQw4w9WgXcQ';
      expect(cutIn.videoId).toBe('dQw4w9WgXcQ');
    });

    it('URLが空の場合空文字列を返す', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = '';
      expect(cutIn.videoId).toBe('');
    });

    it('YouTube以外のURLは空文字列を返す', () => {
      cutIn.isVideoCutIn = true;
      cutIn.videoUrl = 'https://vimeo.com/123456';
      expect(cutIn.videoId).toBe('');
    });
  });

  describe('videoStart', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
      cutIn.isVideoCutIn = true;
    });

    it('startパラメータから秒数を抽出する', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123&start=120';
      expect(cutIn.videoStart).toBe('120');
    });

    it('tパラメータから秒数を抽出する', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123&t=60';
      expect(cutIn.videoStart).toBe('60');
    });

    it('hms形式を変換する', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123&t=1h2m3s';
      expect(cutIn.videoStart).toBe('3723');
    });

    it('パラメータがない場合nullを返す', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123';
      expect(cutIn.videoStart).toBeFalsy();
    });
  });

  describe('playListId', () => {
    let cutIn: CutIn;

    beforeEach(() => {
      cutIn = new CutIn();
      cutIn.initialize();
      cutIn.isVideoCutIn = true;
    });

    it('listパラメータからプレイリストIDを抽出する', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123&list=PLtest123';
      expect(cutIn.playListId).toBe('PLtest123');
    });

    it('listパラメータがない場合空文字列を返す', () => {
      cutIn.videoUrl = 'https://www.youtube.com/watch?v=abc123';
      expect(cutIn.playListId).toBe('');
    });
  });
});
