import { Logger, LogLevel } from '@axe/core/logging/logger';

describe('Logger', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    Logger.setLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setLevel / getLevel', () => {
    it('reads the default level', () => {
      expect(Logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('changes the level', () => {
      Logger.setLevel(LogLevel.WARN);
      expect(Logger.getLevel()).toBe(LogLevel.WARN);
    });
  });

  describe('at the debug level', () => {
    beforeEach(() => {
      Logger.setLevel(LogLevel.DEBUG);
    });

    it('writes a debug line', () => {
      Logger.debug('テストメッセージ');
      expect(debugSpy).toHaveBeenCalledWith('[DEBUG] テストメッセージ');
    });

    it('writes an info line', () => {
      Logger.info('情報メッセージ');
      expect(infoSpy).toHaveBeenCalledWith('[INFO] 情報メッセージ');
    });

    it('writes a warning', () => {
      Logger.warn('警告メッセージ');
      expect(warnSpy).toHaveBeenCalledWith('[WARN] 警告メッセージ');
    });

    it('writes an error', () => {
      Logger.error('エラーメッセージ');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] エラーメッセージ');
    });
  });

  describe('at the warning level', () => {
    beforeEach(() => {
      Logger.setLevel(LogLevel.WARN);
    });

    it('swallows a debug line', () => {
      Logger.debug('抑制される');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('swallows an info line', () => {
      Logger.info('抑制される');
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('writes a warning', () => {
      Logger.warn('警告');
      expect(warnSpy).toHaveBeenCalledWith('[WARN] 警告');
    });

    it('writes an error', () => {
      Logger.error('エラー');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] エラー');
    });
  });

  describe('with logging off', () => {
    beforeEach(() => {
      Logger.setLevel(LogLevel.NONE);
    });

    it('swallows everything', () => {
      Logger.debug('抑制');
      Logger.info('抑制');
      Logger.warn('抑制');
      Logger.error('抑制');
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('extra arguments', () => {
    it('passes the extra arguments through', () => {
      const extra = { key: 'value' };
      Logger.warn('メッセージ', extra, 42);
      expect(warnSpy).toHaveBeenCalledWith('[WARN] メッセージ', extra, 42);
    });
  });
});
