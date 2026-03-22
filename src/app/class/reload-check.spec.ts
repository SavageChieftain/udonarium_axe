import { TestBed } from '@angular/core/testing';
import { ReloadCheck } from './reload-check';
import { ObjectStore } from './core/synchronize-object/object-store';

describe('ReloadCheck', () => {
  let store: ObjectStore;
  let reloadCheck: ReloadCheck;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();

    reloadCheck = new ReloadCheck('ReloadCheck');
    (reloadCheck as unknown as Record<string, () => void>).createDataElements();
    reloadCheck.initialize();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  describe('reloadCheckStart()', () => {
    it('isOnline=trueの場合reloadOK=true, isAnswer=false', () => {
      reloadCheck.reloadCheckStart(true);
      expect(reloadCheck.isLoadOk()).toBe(true);
    });

    it('isOnline=falseの場合reloadOK=true, isAnswer=true', () => {
      reloadCheck.reloadCheckStart(false);
      expect(reloadCheck.isLoadOk()).toBe(true);
    });
  });

  describe('answerCheck()', () => {
    it('isOnline=falseで初期化後、confirmなしでtrueを返す', () => {
      reloadCheck.reloadCheckStart(false);
      expect(reloadCheck.answerCheck()).toBe(true);
    });

    it('isOnline=trueで初期化後、confirmダイアログが表示される', () => {
      reloadCheck.reloadCheckStart(true);
      window.confirm = vi.fn().mockReturnValue(true);
      expect(reloadCheck.answerCheck()).toBe(true);
      expect(window.confirm).toHaveBeenCalledOnce();
    });

    it('confirmでキャンセルされるとfalseを返す', () => {
      reloadCheck.reloadCheckStart(true);
      window.confirm = vi.fn().mockReturnValue(false);
      expect(reloadCheck.answerCheck()).toBe(false);
    });

    it('2回目以降はconfirmを再表示しない', () => {
      reloadCheck.reloadCheckStart(true);
      window.confirm = vi.fn().mockReturnValue(true);
      reloadCheck.answerCheck();
      reloadCheck.answerCheck();
      expect(window.confirm).toHaveBeenCalledOnce();
    });
  });

  describe('isLoadOk()', () => {
    it('初期状態ではtrueを返す', () => {
      expect(reloadCheck.isLoadOk()).toBe(true);
    });
  });
});
