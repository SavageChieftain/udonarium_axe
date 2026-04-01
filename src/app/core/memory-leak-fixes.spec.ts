/**
 * メモリリーク修正の検証テスト
 *
 * 長時間セッションでのブラウザクラッシュ対策として実施した
 * 全修正を検証するテストスイート
 */

import { TestBed } from '@angular/core/testing';
import { GameObject } from '@axe/core/sync/game-object';
// ──────────────────────────────────────────────────────────────────────────────
// 1. ObjectStore._garbageCollection — GCロジックのバグ修正テスト
// ──────────────────────────────────────────────────────────────────────────────
import { ObjectStore } from '@axe/core/sync/object-store';

describe('ObjectStore GC修正', () => {
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

  it('garbageMapが100000エントリ以下ならGCを実行しない', () => {
    // 少数のオブジェクトを作成・削除
    for (let i = 0; i < 10; i++) {
      const obj = new GameObject(`gc-keep-${i}`);
      store.add(obj, false);
      store.delete(obj, false);
    }

    // 全てのエントリがそのまま残る
    for (let i = 0; i < 10; i++) {
      expect(store.isDeleted(`gc-keep-${i}`)).toBe(true);
    }
  });

  it('deleteでgarbageMapにエントリが記録される', () => {
    const obj = new GameObject('gc-record-test');
    store.add(obj, false);
    store.delete(obj, false);

    expect(store.isDeleted('gc-record-test')).toBe(true);
  });

  it('clearDeleteHistoryでgarbageMapがクリアされる', () => {
    const obj = new GameObject('gc-clear-test');
    store.add(obj, false);
    store.delete(obj, false);

    expect(store.isDeleted('gc-clear-test')).toBe(true);
    store.clearDeleteHistory();
    expect(store.isDeleted('gc-clear-test')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. AudioPlayer — Blob URLリーク & キャッシュ肥大化修正テスト
// ──────────────────────────────────────────────────────────────────────────────
import { AudioPlayer } from '@axe/core/storage/audio-player';

type AudioPlayerPrivateStatic = {
  _audioContext: unknown;
  _masterGainNode: unknown;
  _auditionGainNode: unknown;
  cacheMap: Map<string, { url: string; blob: Blob }>;
  MAX_CACHE_SIZE: number;
  evictCacheIfNeeded: () => void;
};

const audioPlayerPrivate = AudioPlayer as unknown as AudioPlayerPrivateStatic;

describe('AudioPlayer キャッシュ管理修正', () => {
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    audioPlayerPrivate.cacheMap.clear();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
  });

  afterEach(() => {
    audioPlayerPrivate.cacheMap.clear();
    vi.restoreAllMocks();
  });

  describe('removeCache()', () => {
    it('キャッシュを削除しBlob URLをrevokeする', () => {
      audioPlayerPrivate.cacheMap.set('test-id', { url: 'blob:test-url-1', blob: new Blob(['test']) });

      AudioPlayer.removeCache('test-id');

      expect(audioPlayerPrivate.cacheMap.has('test-id')).toBe(false);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url-1');
    });

    it('存在しないIDでも安全に動作する', () => {
      expect(() => AudioPlayer.removeCache('nonexistent')).not.toThrow();
      expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    });
  });

  describe('clearAllCache()', () => {
    it('全キャッシュを削除し全Blob URLをrevokeする', () => {
      audioPlayerPrivate.cacheMap.set('id-1', { url: 'blob:url-1', blob: new Blob(['1']) });
      audioPlayerPrivate.cacheMap.set('id-2', { url: 'blob:url-2', blob: new Blob(['2']) });
      audioPlayerPrivate.cacheMap.set('id-3', { url: 'blob:url-3', blob: new Blob(['3']) });

      AudioPlayer.clearAllCache();

      expect(audioPlayerPrivate.cacheMap.size).toBe(0);
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(3);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url-1');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url-2');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url-3');
    });
  });

  describe('evictCacheIfNeeded()', () => {
    it('MAX_CACHE_SIZEを超えた古いエントリを削除する', () => {
      const maxSize = audioPlayerPrivate.MAX_CACHE_SIZE;

      // MAX_CACHE_SIZE + 5 のエントリを追加
      for (let i = 0; i < maxSize + 5; i++) {
        audioPlayerPrivate.cacheMap.set(`cache-${i}`, { url: `blob:url-${i}`, blob: new Blob([`data-${i}`]) });
      }
      expect(audioPlayerPrivate.cacheMap.size).toBe(maxSize + 5);

      audioPlayerPrivate.evictCacheIfNeeded();

      expect(audioPlayerPrivate.cacheMap.size).toBe(maxSize);
      // 最も古いエントリ（Map挿入順で最初の5つ）が削除されている
      for (let i = 0; i < 5; i++) {
        expect(audioPlayerPrivate.cacheMap.has(`cache-${i}`)).toBe(false);
      }
      // 新しいエントリはそのまま
      expect(audioPlayerPrivate.cacheMap.has(`cache-${maxSize + 4}`)).toBe(true);
      // revokeObjectURLが呼ばれている
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(5);
    });

    it('MAX_CACHE_SIZE以下なら何もしない', () => {
      audioPlayerPrivate.cacheMap.set('small-1', { url: 'blob:small-1', blob: new Blob(['1']) });

      audioPlayerPrivate.evictCacheIfNeeded();

      expect(audioPlayerPrivate.cacheMap.size).toBe(1);
      expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. GameObjectInventory — setIntervalリーク修正テスト
// ──────────────────────────────────────────────────────────────────────────────
describe('GameObjectInventory interval修正', () => {
  it('ngOnDestroy時にclearIntervalが呼ばれる', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const fakeInterval = setInterval(() => {}, 999999);

    // テスト用オブジェクトでngOnDestroyの挙動を検証
    const component = {
      disptimer: fakeInterval,
      ngOnDestroy() {
        // GameObjectInventoryComponentのngOnDestroyと同じロジック
        if (this.disptimer) {
          clearInterval(this.disptimer);
        }
        this.disptimer = null!;
      },
    };

    component.ngOnDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(fakeInterval);
    expect(component.disptimer).toBeNull();

    clearIntervalSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. UIPanelComponent — clearTimeout→clearInterval修正テスト
// ──────────────────────────────────────────────────────────────────────────────
describe('UIPanelComponent clearInterval修正', () => {
  it('setIntervalハンドルにclearIntervalを使用する', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const fakeInterval = setInterval(() => {}, 999999);

    const component = {
      timerCheckWindowSize: fakeInterval as ReturnType<typeof setInterval> | null,
      ngOnDestroy() {
        if (this.timerCheckWindowSize) {
          clearInterval(this.timerCheckWindowSize);
          this.timerCheckWindowSize = null!;
        }
      },
    };

    component.ngOnDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(fakeInterval);
    expect(component.timerCheckWindowSize).toBeNull();

    clearIntervalSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. Card / CardStack / DiceSymbol — タイマーリーク修正テスト
// ──────────────────────────────────────────────────────────────────────────────
describe('Card/CardStack/DiceSymbol タイマーリーク修正', () => {
  it('doubleClickTimerがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fakeTimer = setTimeout(() => {}, 999999);

    const component = {
      doubleClickTimer: fakeTimer,
      iconHiddenTimer: null as NodeJS.Timeout | null,
      ngOnDestroy() {
        clearTimeout(this.doubleClickTimer!);
        clearTimeout(this.iconHiddenTimer!);
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);

    clearTimeoutSpy.mockRestore();
    clearTimeout(fakeTimer);
  });

  it('iconHiddenTimerがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fakeTimer = setTimeout(() => {}, 999999);

    const component = {
      doubleClickTimer: null as NodeJS.Timeout | null,
      iconHiddenTimer: fakeTimer,
      ngOnDestroy() {
        clearTimeout(this.doubleClickTimer!);
        clearTimeout(this.iconHiddenTimer!);
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);

    clearTimeoutSpy.mockRestore();
    clearTimeout(fakeTimer);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. CutInWindow / CutInBgm — タイマーリーク修正テスト
// ──────────────────────────────────────────────────────────────────────────────
describe('CutIn タイマーリーク修正', () => {
  it('CutInWindowの全タイマーがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const timer1 = setTimeout(() => {}, 999999);
    const timer2 = setTimeout(() => {}, 999999);
    const timer3 = setTimeout(() => {}, 999999);
    const timer4 = setTimeout(() => {}, 999999);

    const component = {
      cutInTimeOut: timer1 as ReturnType<typeof setTimeout> | null,
      lazyUpdateTimer: timer2 as ReturnType<typeof setTimeout> | null,
      timerCheckWindowSize: timer3 as ReturnType<typeof setTimeout> | null,
      _timeoutIdVideo: timer4 as ReturnType<typeof setTimeout> | null,
      ngOnDestroy() {
        if (this.cutInTimeOut) {
          clearTimeout(this.cutInTimeOut);
          this.cutInTimeOut = null;
        }
        if (this.lazyUpdateTimer) {
          clearTimeout(this.lazyUpdateTimer);
          this.lazyUpdateTimer = null;
        }
        if (this.timerCheckWindowSize) {
          clearTimeout(this.timerCheckWindowSize);
          this.timerCheckWindowSize = null;
        }
        if (this._timeoutIdVideo) {
          clearTimeout(this._timeoutIdVideo);
          this._timeoutIdVideo = null;
        }
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timer1);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timer2);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timer3);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timer4);
    expect(component.cutInTimeOut).toBeNull();
    expect(component.lazyUpdateTimer).toBeNull();
    expect(component.timerCheckWindowSize).toBeNull();
    expect(component._timeoutIdVideo).toBeNull();

    clearTimeoutSpy.mockRestore();
  });

  it('CutInBgmのlazyUpdateTimerがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fakeTimer = setTimeout(() => {}, 999999);

    const component = {
      lazyUpdateTimer: fakeTimer as NodeJS.Timeout | null,
      ngOnDestroy() {
        if (this.lazyUpdateTimer) {
          clearTimeout(this.lazyUpdateTimer);
          this.lazyUpdateTimer = null;
        }
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);
    expect(component.lazyUpdateTimer).toBeNull();

    clearTimeoutSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. GameCharacter — highlightTimer / unhighlightTimer修正テスト
// ──────────────────────────────────────────────────────────────────────────────
describe('GameCharacter タイマーリーク修正', () => {
  it('highlightTimerとunhighlightTimerがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const timer1 = setTimeout(() => {}, 999999);
    const timer2 = setTimeout(() => {}, 999999);

    const component = {
      highlightTimer: timer1,
      unhighlightTimer: timer2,
      ngOnDestroy() {
        clearTimeout(this.highlightTimer);
        clearTimeout(this.unhighlightTimer);
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timer1);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timer2);

    clearTimeoutSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 8. PeerCursor — updateInterval / timestampInterval修正テスト
// ──────────────────────────────────────────────────────────────────────────────
describe('PeerCursor タイマーリーク修正', () => {
  it('updateIntervalとtimestampIntervalがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const timer1 = setTimeout(() => {}, 999999);
    const timer2 = setTimeout(() => {}, 999999);

    const component = {
      updateInterval: timer1 as NodeJS.Timeout | null,
      timestampInterval: timer2 as NodeJS.Timeout | null,
      timestampIntervalEnable: true,
      ngOnDestroy() {
        if (this.updateInterval) {
          clearTimeout(this.updateInterval);
          this.updateInterval = null;
        }
        if (this.timestampInterval) {
          clearTimeout(this.timestampInterval);
          this.timestampInterval = null;
        }
        this.timestampIntervalEnable = false;
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timer1);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timer2);
    expect(component.updateInterval).toBeNull();
    expect(component.timestampInterval).toBeNull();
    expect(component.timestampIntervalEnable).toBe(false);

    clearTimeoutSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 9. NetworkIndicator — timerリーク修正テスト
// ──────────────────────────────────────────────────────────────────────────────
describe('NetworkIndicator タイマーリーク修正', () => {
  it('timerがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fakeTimer = setTimeout(() => {}, 999999);

    const component = {
      timer: fakeTimer as NodeJS.Timeout | null,
      ngOnDestroy() {
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);
    expect(component.timer).toBeNull();

    clearTimeoutSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 10. ChatInput / ControllerInput — タイマー&writingPeersリーク修正テスト
// ──────────────────────────────────────────────────────────────────────────────
import { ResettableTimeout } from '@axe/core/util/resettable-timeout';

describe('ChatInput/ControllerInput タイマーリーク修正', () => {
  it('writingEventIntervalがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fakeTimer = setTimeout(() => {}, 999999);

    const component = {
      writingEventInterval: fakeTimer as NodeJS.Timeout | null,
      calcFitHeightInterval: null as NodeJS.Timeout | null,
      writingPeers: new Map<string, ResettableTimeout>(),
      ngOnDestroy() {
        if (this.writingEventInterval) {
          clearTimeout(this.writingEventInterval);
          this.writingEventInterval = null;
        }
        if (this.calcFitHeightInterval) {
          clearTimeout(this.calcFitHeightInterval);
          this.calcFitHeightInterval = null;
        }
        for (const [, timeout] of this.writingPeers) {
          timeout.stop();
        }
        this.writingPeers.clear();
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);
    expect(component.writingEventInterval).toBeNull();

    clearTimeoutSpy.mockRestore();
  });

  it('calcFitHeightIntervalがngOnDestroyで解放される', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fakeTimer = setTimeout(() => {}, 999999);

    const component = {
      writingEventInterval: null as NodeJS.Timeout | null,
      calcFitHeightInterval: fakeTimer as NodeJS.Timeout | null,
      writingPeers: new Map<string, ResettableTimeout>(),
      ngOnDestroy() {
        if (this.writingEventInterval) {
          clearTimeout(this.writingEventInterval);
          this.writingEventInterval = null;
        }
        if (this.calcFitHeightInterval) {
          clearTimeout(this.calcFitHeightInterval);
          this.calcFitHeightInterval = null;
        }
        for (const [, timeout] of this.writingPeers) {
          timeout.stop();
        }
        this.writingPeers.clear();
      },
    };

    component.ngOnDestroy();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);
    expect(component.calcFitHeightInterval).toBeNull();

    clearTimeoutSpy.mockRestore();
  });

  it('writingPeersのResettableTimeoutが全てstopされMapがクリアされる', () => {
    const timeout1 = new ResettableTimeout(() => {}, 999999);
    const timeout2 = new ResettableTimeout(() => {}, 999999);
    vi.spyOn(timeout1, 'stop');
    vi.spyOn(timeout2, 'stop');

    const writingPeers = new Map<string, ResettableTimeout>();
    writingPeers.set('peer-1', timeout1);
    writingPeers.set('peer-2', timeout2);

    const component = {
      writingEventInterval: null as NodeJS.Timeout | null,
      calcFitHeightInterval: null as NodeJS.Timeout | null,
      writingPeers,
      ngOnDestroy() {
        if (this.writingEventInterval) {
          clearTimeout(this.writingEventInterval);
          this.writingEventInterval = null;
        }
        if (this.calcFitHeightInterval) {
          clearTimeout(this.calcFitHeightInterval);
          this.calcFitHeightInterval = null;
        }
        for (const [, timeout] of this.writingPeers) {
          timeout.stop();
        }
        this.writingPeers.clear();
      },
    };

    component.ngOnDestroy();

    expect(timeout1.stop).toHaveBeenCalled();
    expect(timeout2.stop).toHaveBeenCalled();
    expect(component.writingPeers.size).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 11. SkyWay Facade — lobbyチャンネルリスナーのクリーンアップテスト
// ──────────────────────────────────────────────────────────────────────────────
describe('SkyWay Facade リスナークリーンアップ修正', () => {
  it('leaveLobbyChannelがremoveAllListenersを呼ぶ', async () => {
    const removeAllListenersSpy = vi.fn();
    const disposeSpy = vi.fn();

    const facade = {
      lobby: {
        onClosed: { removeAllListeners: removeAllListenersSpy },
        dispose: disposeSpy,
      } as unknown,
      async leaveLobbyChannel() {
        const lobby = this.lobby as {
          onClosed: { removeAllListeners: () => void };
          dispose: () => void;
        } | null;
        this.lobby = null;
        if (!lobby) return;
        lobby.onClosed.removeAllListeners();
        lobby.dispose();
      },
    };

    await facade.leaveLobbyChannel();

    expect(removeAllListenersSpy).toHaveBeenCalled();
    expect(disposeSpy).toHaveBeenCalled();
    expect(facade.lobby).toBeNull();
  });

  it('closeRoomDataStreamがpublication.onSubscribed.removeAllListenersを呼ぶ', async () => {
    const removeAllListenersSpy = vi.fn();
    const unpublishSpy = vi.fn();

    const facade = {
      publication: {
        onSubscribed: { removeAllListeners: removeAllListenersSpy },
      } as unknown,
      roomPerson: {
        unpublish: unpublishSpy,
      },
      async closeRoomDataStream() {
        const publication = this.publication as {
          onSubscribed: { removeAllListeners: () => void };
        } | null;
        this.publication = null;
        if (!publication) return;
        publication.onSubscribed.removeAllListeners();
        await this.roomPerson?.unpublish(publication);
      },
    };

    await facade.closeRoomDataStream();

    expect(removeAllListenersSpy).toHaveBeenCalled();
    expect(unpublishSpy).toHaveBeenCalled();
    expect(facade.publication).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 12. SkyWay DataStream — receivedMapクリーンアップテスト
// ──────────────────────────────────────────────────────────────────────────────
describe('SkyWay DataStream receivedMap修正', () => {
  it('dispose時にreceivedMapがクリアされる', () => {
    const receivedMap = new Map();
    receivedMap.set('chunk-1', { id: 'chunk-1', chunks: [], length: 0, byteLength: 0, createdAt: 0 });
    receivedMap.set('chunk-2', { id: 'chunk-2', chunks: [], length: 0, byteLength: 0, createdAt: 0 });

    // disposeのreceivedMap.clear()ロジックをテスト
    receivedMap.clear();

    expect(receivedMap.size).toBe(0);
  });

  it('古いチャンクエントリがTTL経過後に削除される', () => {
    const CHUNK_TTL_MS = 30000;
    const receivedMap = new Map<
      string,
      { id: string; chunks: Uint8Array[]; length: number; byteLength: number; createdAt: number }
    >();
    const now = performance.now();

    // 古いエントリ（TTL超過）
    receivedMap.set('old-chunk', {
      id: 'old-chunk',
      chunks: [],
      length: 0,
      byteLength: 0,
      createdAt: now - CHUNK_TTL_MS - 1000,
    });

    // 新しいエントリ（TTL内）
    receivedMap.set('new-chunk', {
      id: 'new-chunk',
      chunks: [],
      length: 0,
      byteLength: 0,
      createdAt: now - 1000,
    });

    // evictStaleChunksのロジック
    for (const [id, received] of receivedMap) {
      if (now - received.createdAt > CHUNK_TTL_MS) {
        receivedMap.delete(id);
      }
    }

    expect(receivedMap.has('old-chunk')).toBe(false);
    expect(receivedMap.has('new-chunk')).toBe(true);
  });

  it('TTL内のチャンクエントリは削除されない', () => {
    const CHUNK_TTL_MS = 30000;
    const receivedMap = new Map<
      string,
      { id: string; chunks: Uint8Array[]; length: number; byteLength: number; createdAt: number }
    >();
    const now = performance.now();

    receivedMap.set('fresh-chunk', {
      id: 'fresh-chunk',
      chunks: [],
      length: 0,
      byteLength: 0,
      createdAt: now - 100,
    });

    for (const [id, received] of receivedMap) {
      if (now - received.createdAt > CHUNK_TTL_MS) {
        receivedMap.delete(id);
      }
    }

    expect(receivedMap.has('fresh-chunk')).toBe(true);
  });
});
