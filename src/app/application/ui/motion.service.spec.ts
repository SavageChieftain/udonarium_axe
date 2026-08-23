import { TestBed } from '@angular/core/testing';
import { MotionService } from '@axe/application/ui/motion.service';

describe('MotionService', () => {
  let listener: ((event: MediaQueryListEvent) => void) | null;

  function setup(systemPrefersReduced: boolean): MotionService {
    listener = null;
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          media: query,
          matches: systemPrefersReduced,
          addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) => (listener = fn),
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList
    );

    TestBed.configureTestingModule({ providers: [MotionService] });
    return TestBed.inject(MotionService);
  }

  beforeEach(() => {
    localStorage.removeItem('ui-motion');
    document.documentElement.classList.remove('motion-reduced');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('follows the system setting while on auto', () => {
    expect(setup(true).enabled()).toBe(false);
    TestBed.resetTestingModule();
    expect(setup(false).enabled()).toBe(true);
  });

  it('plays effects the system asked to stop once told to', () => {
    const service = setup(true);
    service.setting.set('on');

    expect(service.enabled()).toBe(true);
  });

  it('stops effects the system allows once told to', () => {
    const service = setup(false);
    service.setting.set('off');

    expect(service.enabled()).toBe(false);
  });

  it('follows the system setting as it changes', () => {
    const service = setup(false);
    expect(service.enabled()).toBe(true);

    listener?.({ matches: true } as MediaQueryListEvent);

    expect(service.enabled()).toBe(false);
  });

  it('keeps its own setting when the system setting changes', () => {
    const service = setup(false);
    service.setting.set('on');

    listener?.({ matches: true } as MediaQueryListEvent);

    expect(service.enabled()).toBe(true);
  });

  it('cycles through auto, on and off', () => {
    const service = setup(false);

    service.cycle();
    expect(service.setting()).toBe('on');
    service.cycle();
    expect(service.setting()).toBe('off');
    service.cycle();
    expect(service.setting()).toBe('auto');
  });

  it('marks the document when effects are stopped', () => {
    const service = setup(false);
    expect(document.documentElement.classList.contains('motion-reduced')).toBe(false);

    service.setting.set('off');
    TestBed.tick();

    expect(document.documentElement.classList.contains('motion-reduced')).toBe(true);
  });

  it('remembers a choice across a reload', () => {
    setup(false).set('off');
    TestBed.resetTestingModule();

    expect(setup(false).setting()).toBe('off');
  });

  it('writes nothing down until a choice is made', () => {
    setup(true);

    expect(localStorage.getItem('ui-motion')).toBeNull();
  });
});
