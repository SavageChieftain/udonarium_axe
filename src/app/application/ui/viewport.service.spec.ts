import { TestBed } from '@angular/core/testing';
import { COMPACT_VIEWPORT_QUERY, TOUCH_POINTER_QUERY, ViewportService } from '@axe/application/ui/viewport.service';

interface FakeMediaQueryList {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe('ViewportService', () => {
  let mql: FakeMediaQueryList;
  let listeners: Map<string, (event: MediaQueryListEvent) => void>;
  let listener: ((event: MediaQueryListEvent) => void) | null;

  function setup(matches: boolean): ViewportService {
    listeners = new Map();
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      const fake: FakeMediaQueryList = {
        matches,
        addEventListener: vi.fn((_: string, fn: (event: MediaQueryListEvent) => void) => listeners.set(query, fn)),
        removeEventListener: vi.fn(),
      };
      mql = fake;
      return fake as unknown as MediaQueryList;
    });

    TestBed.configureTestingModule({ providers: [ViewportService] });
    const service = TestBed.inject(ViewportService);
    listener = listeners.get(COMPACT_VIEWPORT_QUERY) ?? null;
    return service;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('狭い画面ではコンパクト扱いになる', () => {
    const service = setup(true);
    expect(service.isCompact()).toBe(true);
  });

  it('広い画面ではコンパクト扱いにならない', () => {
    const service = setup(false);
    expect(service.isCompact()).toBe(false);
  });

  it('画面幅のしきい値を問い合わせる', () => {
    setup(false);
    expect(window.matchMedia).toHaveBeenCalledWith(COMPACT_VIEWPORT_QUERY);
  });

  it('画面幅の変化に追従する', () => {
    const service = setup(false);

    listener?.({ matches: true } as MediaQueryListEvent);
    expect(service.isCompact()).toBe(true);

    listener?.({ matches: false } as MediaQueryListEvent);
    expect(service.isCompact()).toBe(false);
  });

  it('粗いポインタを問い合わせる', () => {
    setup(false);
    expect(window.matchMedia).toHaveBeenCalledWith(TOUCH_POINTER_QUERY);
  });

  it('横向きのスマートフォンもコンパクト扱いに含める', () => {
    setup(false);
    expect(COMPACT_VIEWPORT_QUERY).toContain('(max-height: 500px) and (pointer: coarse)');
  });

  it('破棄時に購読を解除する', () => {
    setup(false);
    TestBed.resetTestingModule();

    expect(mql.removeEventListener).toHaveBeenCalled();
  });
});
