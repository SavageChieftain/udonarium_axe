import { TestBed } from '@angular/core/testing';
import { CutInLauncher } from './cut-in-launcher';
import { CutIn } from './cut-in';
import { ObjectStore } from './core/synchronize-object/object-store';

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
    it('test がデフォルト "test001"', () => {
      const launcher = new CutInLauncher('CutInLauncher');
      launcher.initialize();
      expect(launcher.test).toBe('test001');
    });

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
});
