import { TestBed } from '@angular/core/testing';
import { parseWidgetVisibility, WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { beforeEach, describe, expect, it } from 'vitest';

describe('parseWidgetVisibility', () => {
  it('保存が無ければミニプレイヤーだけ出す', () => {
    expect(parseWidgetVisibility(null)).toEqual({
      clock: false,
      miniPlayer: true,
      connectionQuality: false,
      recording: true,
    });
  });

  it('保存された状態を読む', () => {
    expect(
      parseWidgetVisibility('{"clock":true,"miniPlayer":false,"connectionQuality":true,"recording":false}')
    ).toEqual({
      clock: true,
      miniPlayer: false,
      connectionQuality: true,
      recording: false,
    });
  });

  it('壊れた保存値は既定に倒す', () => {
    expect(parseWidgetVisibility('{')).toEqual({
      clock: false,
      miniPlayer: true,
      connectionQuality: false,
      recording: true,
    });
    expect(parseWidgetVisibility('null')).toEqual({
      clock: false,
      miniPlayer: true,
      connectionQuality: false,
      recording: true,
    });
  });

  it('欠けている項目だけ既定で埋める', () => {
    expect(parseWidgetVisibility('{"clock":true}')).toEqual({
      clock: true,
      miniPlayer: true,
      connectionQuality: false,
      recording: true,
    });
  });
});

describe('WidgetVisibilityService', () => {
  let service: WidgetVisibilityService;

  beforeEach(() => {
    localStorage.removeItem('ui-widgets');
    TestBed.configureTestingModule({});
    service = TestBed.inject(WidgetVisibilityService);
  });

  it('既定ではミニプレイヤーだけ出ている', () => {
    expect(service.clock()).toBe(false);
    expect(service.miniPlayer()).toBe(true);
    expect(service.connectionQuality()).toBe(false);
    expect(service.recording()).toBe(true);
  });

  it('それぞれ独立に切り替わる', () => {
    service.toggleClock();
    expect(service.clock()).toBe(true);
    expect(service.miniPlayer()).toBe(true);

    service.toggleMiniPlayer();
    expect(service.miniPlayer()).toBe(false);
    expect(service.clock()).toBe(true);

    service.toggleConnectionQuality();
    expect(service.connectionQuality()).toBe(true);
    expect(service.clock()).toBe(true);
    expect(service.miniPlayer()).toBe(false);
  });
});
