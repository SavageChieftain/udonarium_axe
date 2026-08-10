import { TestBed } from '@angular/core/testing';
import { parseWidgetLayout, WidgetLayoutService } from '@axe/application/ui/widget-layout.service';

const STORAGE_KEY = 'ui-widget-layout';

describe('parseWidgetLayout()', () => {
  it('保存が無ければ空にすること', () => {
    expect(parseWidgetLayout(null)).toEqual({});
    expect(parseWidgetLayout('{')).toEqual({});
    expect(parseWidgetLayout('null')).toEqual({});
  });

  it('置き場所として読めるものだけ拾うこと', () => {
    const layout = parseWidgetLayout(
      JSON.stringify({
        clock: { left: 10, top: 20 },
        broken: { left: 'ひだり', top: 20 },
        partial: { left: 10 },
        wild: { left: Number.NaN, top: 0 },
      })
    );

    expect(layout).toEqual({ clock: { left: 10, top: 20 } });
  });
});

describe('WidgetLayoutService', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('覚えていないうちは何も返さないこと', () => {
    expect(TestBed.inject(WidgetLayoutService).spotOf('clock')).toBeNull();
  });

  it('置き場所を次に開いたときへ持ち越すこと', () => {
    TestBed.inject(WidgetLayoutService).remember('clock', { left: 240.4, top: 120.6 });

    TestBed.resetTestingModule();
    expect(TestBed.inject(WidgetLayoutService).spotOf('clock')).toEqual({ left: 240, top: 121 });
  });

  it('ウィジェットごとに別々に覚えること', () => {
    const service = TestBed.inject(WidgetLayoutService);
    service.remember('clock', { left: 10, top: 20 });
    service.remember('connectionQuality', { left: 30, top: 40 });

    expect(service.spotOf('clock')).toEqual({ left: 10, top: 20 });
    expect(service.spotOf('connectionQuality')).toEqual({ left: 30, top: 40 });
  });

  it('数として読めない置き場所は覚えないこと', () => {
    const service = TestBed.inject(WidgetLayoutService);
    service.remember('clock', { left: Number.NaN, top: 0 });
    expect(service.spotOf('clock')).toBeNull();
  });

  it('忘れさせられること', () => {
    const service = TestBed.inject(WidgetLayoutService);
    service.remember('clock', { left: 10, top: 20 });
    service.forget('clock');

    expect(service.spotOf('clock')).toBeNull();
    expect(TestBed.inject(WidgetLayoutService).spotOf('clock')).toBeNull();
  });

  it('画面の外に出た置き場所を引き戻すこと', () => {
    const service = TestBed.inject(WidgetLayoutService);
    const spot = service.keepInView({ left: 99_999, top: -50 }, 100, 40);

    expect(spot.left).toBe(window.innerWidth - 100 - 8);
    expect(spot.top).toBe(8);
  });

  it('入る置き場所はそのままにすること', () => {
    expect(TestBed.inject(WidgetLayoutService).keepInView({ left: 40, top: 60 }, 100, 40)).toEqual({
      left: 40,
      top: 60,
    });
  });
});
