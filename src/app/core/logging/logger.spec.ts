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
    it('デフォルトのログレベルを取得できること', () => {
      expect(Logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('ログレベルを変更できること', () => {
      Logger.setLevel(LogLevel.WARN);
      expect(Logger.getLevel()).toBe(LogLevel.WARN);
    });
  });

  describe('DEBUG レベル', () => {
    beforeEach(() => {
      Logger.setLevel(LogLevel.DEBUG);
    });

    it('debug() が console.debug を呼ぶこと', () => {
      Logger.debug('テストメッセージ');
      expect(debugSpy).toHaveBeenCalledWith('[DEBUG] テストメッセージ');
    });

    it('info() が console.info を呼ぶこと', () => {
      Logger.info('情報メッセージ');
      expect(infoSpy).toHaveBeenCalledWith('[INFO] 情報メッセージ');
    });

    it('warn() が console.warn を呼ぶこと', () => {
      Logger.warn('警告メッセージ');
      expect(warnSpy).toHaveBeenCalledWith('[WARN] 警告メッセージ');
    });

    it('error() が console.error を呼ぶこと', () => {
      Logger.error('エラーメッセージ');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] エラーメッセージ');
    });
  });

  describe('WARN レベル', () => {
    beforeEach(() => {
      Logger.setLevel(LogLevel.WARN);
    });

    it('debug() が抑制されること', () => {
      Logger.debug('抑制される');
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it('info() が抑制されること', () => {
      Logger.info('抑制される');
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('warn() が出力されること', () => {
      Logger.warn('警告');
      expect(warnSpy).toHaveBeenCalledWith('[WARN] 警告');
    });

    it('error() が出力されること', () => {
      Logger.error('エラー');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] エラー');
    });
  });

  describe('NONE レベル', () => {
    beforeEach(() => {
      Logger.setLevel(LogLevel.NONE);
    });

    it('全てのログが抑制されること', () => {
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

  describe('追加引数', () => {
    it('追加引数が console に渡されること', () => {
      const extra = { key: 'value' };
      Logger.warn('メッセージ', extra, 42);
      expect(warnSpy).toHaveBeenCalledWith('[WARN] メッセージ', extra, 42);
    });
  });
});
