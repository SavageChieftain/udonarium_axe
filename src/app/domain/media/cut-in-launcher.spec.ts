import { TestBed } from '@angular/core/testing';
import { Network } from '@axe/core/index';
import { AudioFile } from '@axe/core/storage/audio-file';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { stopCutInByBgm$ } from '@axe/domain/domain-events';
import { CutIn } from '@axe/domain/media/cut-in';
import { CutInLauncher } from '@axe/domain/media/cut-in-launcher';
import { Jukebox } from '@axe/domain/media/jukebox';

describe('CutInLauncher', () => {
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
    it('launchCutInIdentifier がデフォルト空文字', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      expect(launcher.launchCutInIdentifier).toBe('');
    });

    it('launchTimeStamp がデフォルト 0', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      expect(launcher.launchTimeStamp).toBe(0);
    });

    it('launchIsStart がデフォルト false', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      expect(launcher.launchIsStart).toBe(false);
    });

    it('sendTo がデフォルト空文字', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      expect(launcher.sendTo).toBe('');
    });
  });

  describe('getCutIns()', () => {
    it('ObjectStore内のCutInオブジェクト一覧を返す', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      const cutIn1 = new CutIn();
      cutIn1.initialize();
      const cutIn2 = new CutIn();
      cutIn2.initialize();

      const cutIns = launcher.getCutIns();
      expect(cutIns).toHaveLength(2);
    });

    it('CutInがない場合空配列を返す', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      expect(launcher.getCutIns()).toEqual([]);
    });
  });

  describe('startCutIn / stopCutIn', () => {
    it('startCutInでlaunchCutInIdentifierを設定する', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      const cutIn = new CutIn();
      cutIn.initialize();

      launcher.startCutIn(cutIn);
      expect(launcher.launchCutInIdentifier).toBe(cutIn.identifier);
      expect(launcher.launchIsStart).toBe(true);
      expect(launcher.launchMySelf).toBe(false);
    });

    it('stopCutInでlaunchIsStartをfalseに設定する', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      const cutIn = new CutIn();
      cutIn.initialize();

      launcher.stopCutIn(cutIn);
      expect(launcher.launchCutInIdentifier).toBe(cutIn.identifier);
      expect(launcher.launchIsStart).toBe(false);
    });

    it('startCutInMySelfでlaunchMySelfをtrueに設定する', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      const cutIn = new CutIn();
      cutIn.initialize();

      launcher.startCutInMySelf(cutIn);
      expect(launcher.launchMySelf).toBe(true);
    });

    it('startCutInでsendToを設定する', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      const cutIn = new CutIn();
      cutIn.initialize();

      launcher.startCutIn(cutIn, 'user-1');
      expect(launcher.sendTo).toBe('user-1');
    });
  });

  describe('sameTagCutIn()', () => {
    it('同じタグのCutInを返す', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      const cutIn1 = new CutIn();
      cutIn1.initialize();
      cutIn1.tagName = 'battle';

      const cutIn2 = new CutIn();
      cutIn2.initialize();
      cutIn2.tagName = 'battle';

      const cutIn3 = new CutIn();
      cutIn3.initialize();
      cutIn3.tagName = 'other';

      const same = launcher.sameTagCutIn(cutIn1);
      expect(same).toHaveLength(1);
      expect(same[0]).toBe(cutIn2);
    });
  });

  describe('launchTimeStamp', () => {
    it('startCutInでインクリメントされる', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      const cutIn = new CutIn();
      cutIn.initialize();

      expect(launcher.launchTimeStamp).toBe(0);
      launcher.startCutIn(cutIn);
      expect(launcher.launchTimeStamp).toBe(1);
      launcher.startCutIn(cutIn);
      expect(launcher.launchTimeStamp).toBe(2);
    });
  });

  describe('isCutInBgmUploaded()', () => {
    afterEach(() => {
      AudioStorage.instance.audios.forEach((a) => AudioStorage.instance.delete(a.identifier));
    });

    it('AudioStorage に存在する identifier なら true', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      const audio = AudioFile.createEmpty('uploaded-audio');
      AudioStorage.instance.add(audio);

      expect(launcher.isCutInBgmUploaded('uploaded-audio')).toBe(true);
    });

    it('AudioStorage にない identifier なら false', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      expect(launcher.isCutInBgmUploaded('missing-audio')).toBe(false);
    });
  });

  describe('stopBlankTagCutIn()', () => {
    it('stopBlankTagCutInTimeStamp をインクリメントし stopCutInByBgm$ を emit する', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      let emitted = false;
      const cleanup = stopCutInByBgm$.subscribe(() => {
        emitted = true;
      });

      expect(launcher.stopBlankTagCutInTimeStamp).toBe(0);
      launcher.stopBlankTagCutIn();
      expect(launcher.stopBlankTagCutInTimeStamp).toBe(1);
      expect(emitted).toBe(true);
      cleanup();
    });
  });

  describe('chatActivateCutIn()', () => {
    afterEach(() => {
      AudioStorage.instance.audios.forEach((a) => AudioStorage.instance.delete(a.identifier));
    });

    it('テキスト末尾のワードがcutIn.nameと一致すると startCutIn が呼ばれる', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      const jukebox = new Jukebox('Jukebox');
      jukebox.initialize();

      const cutIn = new CutIn();
      cutIn.initialize();
      cutIn.name = '炎の剣';
      cutIn.chatActivate = true;

      const spy = vi.spyOn(launcher, 'startCutIn');
      launcher.chatActivateCutIn('演出 炎の剣', '');

      expect(spy).toHaveBeenCalledWith(cutIn, '');
    });

    it('chatActivate=false のカットインにはマッチしない', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      const jukebox = new Jukebox('Jukebox');
      jukebox.initialize();

      const cutIn = new CutIn();
      cutIn.initialize();
      cutIn.name = '攻撃';
      cutIn.chatActivate = false;

      const spy = vi.spyOn(launcher, 'startCutIn');
      launcher.chatActivateCutIn('攻撃', '');

      expect(spy).not.toHaveBeenCalled();
    });

    it('無タグで音声付きのカットインの場合 jukebox.stop() が呼ばれる', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      const jukebox = new Jukebox('Jukebox');
      jukebox.initialize();
      const stopSpy = vi.spyOn(jukebox, 'stop').mockImplementation(() => {});

      // AudioStorage にオーディオファイルを追加
      const audio = AudioFile.createEmpty('cutin-audio-01');
      AudioStorage.instance.add(audio);

      const cutIn = new CutIn();
      cutIn.initialize();
      cutIn.name = 'BGM停止';
      cutIn.chatActivate = true;
      cutIn.audioIdentifier = 'cutin-audio-01';
      cutIn.tagName = ''; // 無タグ

      vi.spyOn(launcher, 'startCutIn').mockImplementation(() => {});

      launcher.chatActivateCutIn('再生 BGM停止', '');

      expect(stopSpy).toHaveBeenCalledOnce();
    });
  });

  describe('apply() — P2P 同期', () => {
    it('初回 sync ではカットイン発火しない', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      const startSpy = vi.spyOn(launcher, 'startSelfCutIn');

      const context = launcher.toContext();
      context.syncData = { ...context.syncData, launchIsStart: true, launchTimeStamp: 1 };
      launcher.apply(context);

      expect(startSpy).not.toHaveBeenCalled();
    });

    it('launchMySelf=true の場合は他ピアでは発火しない', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      // 初回 sync をスキップ
      const initCtx = launcher.toContext();
      launcher.apply(initCtx);

      const startSpy = vi.spyOn(launcher, 'startSelfCutIn');

      const ctx2 = launcher.toContext();
      ctx2.syncData = {
        ...ctx2.syncData,
        launchMySelf: true,
        launchIsStart: true,
        launchTimeStamp: 1,
      };
      launcher.apply(ctx2);

      expect(startSpy).not.toHaveBeenCalled();
    });

    it('launchIsStart=true で launchTimeStamp が変わると startSelfCutIn が呼ばれる', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      // 初回 sync をスキップ
      const initCtx = launcher.toContext();
      launcher.apply(initCtx);

      const startSpy = vi.spyOn(launcher, 'startSelfCutIn').mockImplementation(() => {});

      const cutIn = new CutIn();
      cutIn.initialize();

      const ctx2 = launcher.toContext();
      ctx2.syncData = {
        ...ctx2.syncData,
        launchCutInIdentifier: cutIn.identifier,
        launchIsStart: true,
        launchTimeStamp: 1,
      };
      launcher.apply(ctx2);

      expect(startSpy).toHaveBeenCalledOnce();
    });

    it('launchIsStart=false で launchTimeStamp が変わると stopSelfCutIn が呼ばれる', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      // 初回 sync をスキップ
      const initCtx = launcher.toContext();
      launcher.apply(initCtx);

      const stopSpy = vi.spyOn(launcher, 'stopSelfCutIn').mockImplementation(() => {});

      const cutIn = new CutIn();
      cutIn.initialize();

      const ctx2 = launcher.toContext();
      ctx2.syncData = {
        ...ctx2.syncData,
        launchCutInIdentifier: cutIn.identifier,
        launchIsStart: false,
        launchTimeStamp: 1,
      };
      launcher.apply(ctx2);

      expect(stopSpy).toHaveBeenCalledOnce();
    });

    it('sendTo が設定されており自分以外なら発火しない', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      // 初回 sync をスキップ
      const initCtx = launcher.toContext();
      launcher.apply(initCtx);

      const startSpy = vi.spyOn(launcher, 'startSelfCutIn').mockImplementation(() => {});

      // 自分の userId と異なる sendTo
      const origUserId = Network.peerContext.userId;
      (Network.peerContext as { userId: string }).userId = 'my-user';

      const ctx2 = launcher.toContext();
      ctx2.syncData = {
        ...ctx2.syncData,
        sendTo: 'other-user',
        launchIsStart: true,
        launchTimeStamp: 1,
      };
      launcher.apply(ctx2);

      expect(startSpy).not.toHaveBeenCalled();
      (Network.peerContext as { userId: string }).userId = origUserId;
    });

    it('stopBlankTagCutInTimeStamp が変わると stopCutInByBgm$ が emit される', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();

      // 初回 sync をスキップ
      const initCtx = launcher.toContext();
      launcher.apply(initCtx);

      let emitted = false;
      const cleanup = stopCutInByBgm$.subscribe(() => {
        emitted = true;
      });

      const ctx2 = launcher.toContext();
      ctx2.syncData = { ...ctx2.syncData, stopBlankTagCutInTimeStamp: 1 };
      launcher.apply(ctx2);

      expect(emitted).toBe(true);
      cleanup();
    });
  });
});
