import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Jukebox } from './Jukebox';
import { ObjectStore } from './core/synchronize-object/object-store';

describe('Jukebox', () => {
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
    vi.restoreAllMocks();
  });

  describe('SyncVar デフォルト値', () => {
    it('audioIdentifierが空文字', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      expect(jukebox.audioIdentifier).toBe('');
    });

    it('startTimeが0', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      expect(jukebox.startTime).toBe(0);
    });

    it('isLoopがfalse', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      expect(jukebox.isLoop).toBe(false);
    });

    it('isPlayingがfalse', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      expect(jukebox.isPlaying).toBe(false);
    });
  });

  describe('volume', () => {
    it('デフォルトは0.5', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      expect(jukebox.volume).toBe(0.5);
    });

    it('設定できる', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      jukebox.volume = 0.8;
      expect(jukebox.volume).toBe(0.8);
    });
  });

  describe('auditionVolume', () => {
    it('デフォルトは0.5', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      expect(jukebox.auditionVolume).toBe(0.5);
    });

    it('設定できる', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      jukebox.auditionVolume = 0.3;
      expect(jukebox.auditionVolume).toBe(0.3);
    });
  });

  describe('stop', () => {
    it('停止するとaudioIdentifierが空になりisPlayingがfalse', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      jukebox.audioIdentifier = 'some-audio';
      jukebox.isPlaying = true;
      jukebox.stop();
      expect(jukebox.audioIdentifier).toBe('');
      expect(jukebox.isPlaying).toBe(false);
    });
  });
});
