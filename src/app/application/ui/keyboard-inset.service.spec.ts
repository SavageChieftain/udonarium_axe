import { TestBed } from '@angular/core/testing';
import { KeyboardInsetService, measureKeyboardInset } from '@axe/application/ui/keyboard-inset.service';

describe('measureKeyboardInset', () => {
  it('reports nothing while the keyboard is away', () => {
    expect(measureKeyboardInset({ height: 800, offsetTop: 0 }, 800)).toBe(0);
  });

  it('ignores a small discrepancy', () => {
    expect(measureKeyboardInset({ height: 790, offsetTop: 0 }, 800)).toBe(0);
  });

  it('reports how much is hidden', () => {
    expect(measureKeyboardInset({ height: 480, offsetTop: 0 }, 800)).toBe(320);
  });

  it('counts the page offset as well', () => {
    expect(measureKeyboardInset({ height: 480, offsetTop: 60 }, 800)).toBe(260);
  });

  it('reports nothing while the view is pinched', () => {
    expect(measureKeyboardInset({ height: 400, offsetTop: 0, scale: 2 }, 800)).toBe(0);
  });
});

describe('KeyboardInsetService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    Reflect.deleteProperty(window, 'visualViewport');
  });

  it('follows the visual viewport as it changes', () => {
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

  it('subscribes once however often it is initialised', () => {
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
