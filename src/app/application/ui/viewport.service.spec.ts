import { TestBed } from '@angular/core/testing';
import { COMPACT_VIEWPORT_QUERY, ViewportService } from '@axe/application/ui/viewport.service';

interface FakeMediaQueryList {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe('ViewportService', () => {
  let mql: FakeMediaQueryList;
  let listener: ((event: MediaQueryListEvent) => void) | null;

  function setup(matches: boolean): ViewportService {
    listener = null;
    mql = {
      matches,
      addEventListener: vi.fn((_: string, fn: (event: MediaQueryListEvent) => void) => (listener = fn)),
      removeEventListener: vi.fn(),
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);

    TestBed.configureTestingModule({ providers: [ViewportService] });
    return TestBed.inject(ViewportService);
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

  it('破棄時に購読を解除する', () => {
    setup(false);
    TestBed.resetTestingModule();

    expect(mql.removeEventListener).toHaveBeenCalled();
  });
});
