import { TestBed } from '@angular/core/testing';
import { KeyboardInsetService, measureKeyboardInset } from '@axe/application/ui/keyboard-inset.service';

describe('measureKeyboardInset', () => {
  it('キーボードが出ていなければ 0 を返す', () => {
    expect(measureKeyboardInset({ height: 800, offsetTop: 0 }, 800)).toBe(0);
  });

  it('わずかなずれは無視する', () => {
    expect(measureKeyboardInset({ height: 790, offsetTop: 0 }, 800)).toBe(0);
  });

  it('隠れた高さを返す', () => {
    expect(measureKeyboardInset({ height: 480, offsetTop: 0 }, 800)).toBe(320);
  });

  it('ページのずれ込みを含めて計算する', () => {
    expect(measureKeyboardInset({ height: 480, offsetTop: 60 }, 800)).toBe(260);
  });

  it('ピンチで拡大している間は 0 を返す', () => {
    expect(measureKeyboardInset({ height: 400, offsetTop: 0, scale: 2 }, 800)).toBe(0);
  });
});

describe('KeyboardInsetService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    Reflect.deleteProperty(window, 'visualViewport');
  });

  it('visualViewport の変化を追いかける', () => {
    const listeners = new Map<string, () => void>();
    const viewport = {
      height: 800,
      offsetTop: 0,
      addEventListener: (type: string, fn: () => void) => listeners.set(type, fn),
      removeEventListener: () => undefined,
    };
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    TestBed.configureTestingModule({ providers: [KeyboardInsetService] });
    const service = TestBed.inject(KeyboardInsetService);
    service.initialize();
    expect(service.inset()).toBe(0);

    viewport.height = 500;
    listeners.get('resize')?.();

    expect(service.inset()).toBe(300);
  });

  it('initialize を重ねて呼んでも購読は 1 度だけになる', () => {
    const listeners: string[] = [];
    const viewport = {
      height: 800,
      offsetTop: 0,
      addEventListener: (type: string) => listeners.push(type),
      removeEventListener: () => undefined,
    };
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });

    TestBed.configureTestingModule({ providers: [KeyboardInsetService] });
    const service = TestBed.inject(KeyboardInsetService);
    service.initialize();
    service.initialize();

    expect(listeners).toEqual(['resize', 'scroll']);
  });
});
