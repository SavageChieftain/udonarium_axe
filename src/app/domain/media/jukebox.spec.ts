import { TestBed } from '@angular/core/testing';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioPlayer, VolumeType } from '@axe/core/storage/audio-player';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { updateAudioResource$ } from '@axe/domain/domain-events';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { Jukebox } from '@axe/domain/media/jukebox';
import { Config } from '@axe/domain/peer/config';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeAudioFile(opts: { blob?: Blob | null; url?: string; identifier?: string } = {}): AudioFile {
  const identifier = opts.identifier ?? 'test-audio';
  const audio = AudioFile.createEmpty(identifier);
  const ctx = (audio as unknown as { context: Record<string, unknown> }).context;
  ctx['blob'] = opts.blob ?? null;
  ctx['url'] = opts.url ?? '';
  return audio;
}

function makeReadyAudio(identifier: string): AudioFile {
  return makeAudioFile({ identifier, blob: new Blob(['x']), url: 'blob:x' });
}

/** AudioPlayer.play() をモックする (AudioContext 不要) */
function stubAudioPlayerPlay() {
  return vi.spyOn(AudioPlayer.prototype, 'play').mockImplementation(() => {});
}
function stubAudioPlayerStop() {
  return vi.spyOn(AudioPlayer.prototype, 'stop').mockImplementation(() => {});
}

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
    AudioStorage.instance.audios.forEach((a) => AudioStorage.instance.delete(a.identifier));
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

  describe('seVolume', () => {
    it('デフォルトは0.5', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      expect(jukebox.seVolume).toBe(0.5);
    });

    it('設定できる', () => {
      const jukebox = new Jukebox();
      jukebox.initialize();
      jukebox.seVolume = 0.7;
      expect(jukebox.seVolume).toBe(0.7);
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

  describe('play()', () => {
    it('ready な AudioFile で isPlaying=true, audioIdentifier が設定される', () => {
      const playSpy = stubAudioPlayerPlay();
      stubAudioPlayerStop();
      const jukebox = new Jukebox();
      jukebox.initialize();

      const audio = makeReadyAudio('bgm-01');
      AudioStorage.instance.add(audio);

      jukebox.play('bgm-01', true);

      expect(jukebox.audioIdentifier).toBe('bgm-01');
      expect(jukebox.isPlaying).toBe(true);
      expect(jukebox.isLoop).toBe(true);
      expect(playSpy).toHaveBeenCalledOnce();
    });

    it('AudioStorage に存在しない identifier では再生しない', () => {
      const playSpy = stubAudioPlayerPlay();
      const jukebox = new Jukebox();
      jukebox.initialize();

      jukebox.play('not-exist');

      expect(jukebox.isPlaying).toBe(false);
      expect(playSpy).not.toHaveBeenCalled();
    });

    it('isReady=false のオーディオでは再生しない', () => {
      const playSpy = stubAudioPlayerPlay();
      const jukebox = new Jukebox();
      jukebox.initialize();

      const audio = makeAudioFile({ identifier: 'null-audio' }); // blob=null, url=''
      AudioStorage.instance.add(audio);

      jukebox.play('null-audio');

      expect(jukebox.isPlaying).toBe(false);
      expect(playSpy).not.toHaveBeenCalled();
    });
  });

  describe('_play() — SE タグ判定', () => {
    it('SE タグなしの場合 volumeType=MASTER で loop が設定される', () => {
      const playSpy = stubAudioPlayerPlay();
      stubAudioPlayerStop();
      const jukebox = new Jukebox();
      jukebox.initialize();

      const audio = makeReadyAudio('bgm-02');
      AudioStorage.instance.add(audio);

      jukebox.play('bgm-02', true);

      const player = (jukebox as unknown as { audioPlayer: AudioPlayer }).audioPlayer;
      expect(player.volumeType).toBe(VolumeType.MASTER);
      expect(player.loop).toBe(true);
      expect(playSpy).toHaveBeenCalledOnce();
    });

    it('SE タグ付きの場合 volumeType=SE で loop=false', () => {
      const playSpy = stubAudioPlayerPlay();
      stubAudioPlayerStop();
      const jukebox = new Jukebox();
      jukebox.initialize();

      const audio = makeReadyAudio('se-01');
      AudioStorage.instance.add(audio);
      const tag = AudioTag.create('se-01');
      tag.tag = 'SE';

      jukebox.play('se-01', true); // isLoop=true でも SE なら loop=false

      const player = (jukebox as unknown as { audioPlayer: AudioPlayer }).audioPlayer;
      expect(player.volumeType).toBe(VolumeType.SE);
      expect(player.loop).toBe(false);
      expect(playSpy).toHaveBeenCalledOnce();
    });
  });

  describe('playAfterFileUpdate()', () => {
    it('audio が未 ready なら updateAudioResource$ で再生を遅延する', () => {
      const playSpy = stubAudioPlayerPlay();
      stubAudioPlayerStop();
      const jukebox = new Jukebox();
      jukebox.initialize();

      // NULL 状態のファイルを追加
      const audio = makeAudioFile({ identifier: 'lazy-audio' });
      AudioStorage.instance.add(audio);

      // play() → ready でないので return → _play() 内で playAfterFileUpdate()
      jukebox.audioIdentifier = 'lazy-audio';
      jukebox.isPlaying = true;
      jukebox.isLoop = true;
      // _play() を直接呼ぶ
      (jukebox as unknown as { _play: () => void })._play();

      expect(playSpy).not.toHaveBeenCalled();

      // AudioFile を ready にして updateAudioResource$ を emit
      const ctx = (audio as unknown as { context: Record<string, unknown> }).context;
      ctx['blob'] = new Blob(['data']);
      ctx['url'] = 'blob:data';
      updateAudioResource$.emit();

      expect(playSpy).toHaveBeenCalledOnce();
    });
  });

  describe('setNewVolume()', () => {
    it('AudioPlayer の静的ボリュームを roomVolume とかけ合わせて設定する', () => {
      // AudioPlayer.volume setter は内部で AudioContext を使用するため stub
      const volumeSpy = vi.spyOn(AudioPlayer, 'volume', 'set').mockImplementation(() => {});
      const auditionSpy = vi.spyOn(AudioPlayer, 'auditionVolume', 'set').mockImplementation(() => {});
      const seSpy = vi.spyOn(AudioPlayer, 'seVolume', 'set').mockImplementation(() => {});

      const jukebox = new Jukebox('Jukebox');
      jukebox.initialize();
      const config = new Config('Config');
      config.initialize();
      config.roomVolume = 0.8;

      jukebox.volume = 0.5;
      jukebox.auditionVolume = 0.6;
      jukebox.seVolume = 0.7;

      jukebox.setNewVolume();

      expect(volumeSpy).toHaveBeenCalledWith(expect.closeTo(0.4));
      expect(auditionSpy).toHaveBeenCalledWith(expect.closeTo(0.48));
      expect(seSpy).toHaveBeenCalledWith(expect.closeTo(0.56));
    });
  });

  describe('apply() — P2P 同期', () => {
    it('初回 sync (isInitialSync) では isPlaying=true なら playAfterFileUpdate が呼ばれる', () => {
      stubAudioPlayerPlay();
      stubAudioPlayerStop();
      const jukebox = new Jukebox();
      jukebox.initialize();

      const playAfterSpy = vi.spyOn(jukebox as unknown as { playAfterFileUpdate: () => void }, 'playAfterFileUpdate');

      // 初期コンテキストを取得
      const context = jukebox.toContext();
      // P2P で audioIdentifier と isPlaying が変わった想定
      context.syncData = { ...context.syncData, audioIdentifier: 'bgm-sync', isPlaying: true };

      jukebox.apply(context);

      expect(playAfterSpy).toHaveBeenCalledOnce();
    });

    it('初回 sync で isPlaying=false なら再生しない', () => {
      stubAudioPlayerStop();
      const jukebox = new Jukebox();
      jukebox.initialize();

      const playAfterSpy = vi.spyOn(jukebox as unknown as { playAfterFileUpdate: () => void }, 'playAfterFileUpdate');

      const context = jukebox.toContext();
      jukebox.apply(context);

      expect(playAfterSpy).not.toHaveBeenCalled();
    });

    it('2回目以降: audioIdentifier が変わり isPlaying=true なら _play() が呼ばれる', () => {
      stubAudioPlayerPlay();
      stubAudioPlayerStop();
      const jukebox = new Jukebox();
      jukebox.initialize();

      // 初回 sync をスキップ
      const initCtx = jukebox.toContext();
      jukebox.apply(initCtx);

      const playSpy = vi.spyOn(jukebox as unknown as { _play: () => void }, '_play');

      // P2P で audioIdentifier が変わって isPlaying=true
      const ctx2 = jukebox.toContext();
      ctx2.syncData = { ...ctx2.syncData, audioIdentifier: 'new-bgm', isPlaying: true };
      jukebox.apply(ctx2);

      expect(playSpy).toHaveBeenCalledOnce();
    });

    it('2回目以降: isPlaying が true→false に変わったら _stop() が呼ばれる', () => {
      stubAudioPlayerStop();
      const jukebox = new Jukebox();
      jukebox.initialize();

      // 初回 sync をスキップ
      const initCtx = jukebox.toContext();
      jukebox.apply(initCtx);

      // isPlaying=true にして状態を設定
      jukebox.isPlaying = true;

      const stopSpy = vi.spyOn(jukebox as unknown as { _stop: () => void }, '_stop');

      // P2P で isPlaying=false に変更
      const ctx2 = jukebox.toContext();
      ctx2.syncData = { ...ctx2.syncData, isPlaying: false };
      jukebox.apply(ctx2);

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
