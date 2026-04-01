import { TestBed } from '@angular/core/testing';
import { Logger } from '@axe/core/logging/logger';
import { LoggerService, LogLevel } from '@axe/core/logging/logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    Logger.setLevel(LogLevel.DEBUG);
    TestBed.configureTestingModule({
      providers: [LoggerService],
    });
    service = TestBed.inject(LoggerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('インスタンスが生成されること', () => {
    expect(service).toBeTruthy();
  });

  it('setLevel() / getLevel() でログレベルを制御できること', () => {
    service.setLevel(LogLevel.ERROR);
    expect(service.getLevel()).toBe(LogLevel.ERROR);
  });

  describe('各ログメソッドが Logger 静的メソッドに委譲すること', () => {
    let debugSpy: ReturnType<typeof vi.spyOn>;
    let infoSpy: ReturnType<typeof vi.spyOn>;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      debugSpy = vi.spyOn(Logger, 'debug').mockImplementation(() => {});
      infoSpy = vi.spyOn(Logger, 'info').mockImplementation(() => {});
      warnSpy = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
      errorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    });

    it('debug()', () => {
      service.debug('テスト', 123);
      expect(debugSpy).toHaveBeenCalledWith('テスト', 123);
    });

    it('info()', () => {
      service.info('情報');
      expect(infoSpy).toHaveBeenCalledWith('情報');
    });

    it('warn()', () => {
      service.warn('警告', { detail: true });
      expect(warnSpy).toHaveBeenCalledWith('警告', { detail: true });
    });

    it('error()', () => {
      service.error('エラー');
      expect(errorSpy).toHaveBeenCalledWith('エラー');
    });
  });
});
