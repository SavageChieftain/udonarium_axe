import { TestBed } from '@angular/core/testing';
import { ReloadCheck } from '@axe/domain/peer/reload-check';

describe('ReloadCheck', () => {
  let reloadCheck: ReloadCheck;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    reloadCheck = new ReloadCheck('ReloadCheck');
    (reloadCheck as unknown as Record<string, () => void>).createDataElements();
    reloadCheck.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reloadCheckStart()', () => {
    it('allows the reload without asking while it is online', () => {
      reloadCheck.reloadCheckStart(true);
      expect(reloadCheck.isLoadOk()).toBe(true);
    });

    it('allows it, having asked, while it is offline', () => {
      reloadCheck.reloadCheckStart(false);
      expect(reloadCheck.isLoadOk()).toBe(true);
    });
  });

  describe('answerCheck()', () => {
    it('allows it without asking offline', () => {
      reloadCheck.reloadCheckStart(false);
      expect(reloadCheck.answerCheck()).toBe(true);
    });

    it('asks first online', () => {
      reloadCheck.reloadCheckStart(true);
      window.confirm = vi.fn().mockReturnValue(true);
      expect(reloadCheck.answerCheck()).toBe(true);
      expect(window.confirm).toHaveBeenCalledOnce();
    });

    it('refuses it when the question is dismissed', () => {
      reloadCheck.reloadCheckStart(true);
      window.confirm = vi.fn().mockReturnValue(false);
      expect(reloadCheck.answerCheck()).toBe(false);
    });

    it('asks only once', () => {
      reloadCheck.reloadCheckStart(true);
      window.confirm = vi.fn().mockReturnValue(true);
      reloadCheck.answerCheck();
      reloadCheck.answerCheck();
      expect(window.confirm).toHaveBeenCalledOnce();
    });
  });

  describe('isLoadOk()', () => {
    it('is true to begin with', () => {
      expect(reloadCheck.isLoadOk()).toBe(true);
    });
  });
});
