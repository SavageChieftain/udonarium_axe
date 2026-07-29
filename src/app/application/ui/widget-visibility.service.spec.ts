import { TestBed } from '@angular/core/testing';
import { parseWidgetVisibility, WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { beforeEach, describe, expect, it } from 'vitest';

describe('parseWidgetVisibility', () => {
  it('保存が無ければミニプレイヤーだけ出す', () => {
    expect(parseWidgetVisibility(null)).toEqual({ clock: false, miniPlayer: true });
  });

  it('保存された状態を読む', () => {
    expect(parseWidgetVisibility('{"clock":true,"miniPlayer":false}')).toEqual({ clock: true, miniPlayer: false });
  });

  it('壊れた保存値は既定に倒す', () => {
    expect(parseWidgetVisibility('{')).toEqual({ clock: false, miniPlayer: true });
    expect(parseWidgetVisibility('null')).toEqual({ clock: false, miniPlayer: true });
  });

  it('欠けている項目だけ既定で埋める', () => {
    expect(parseWidgetVisibility('{"clock":true}')).toEqual({ clock: true, miniPlayer: true });
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
  });

  it('それぞれ独立に切り替わる', () => {
    service.toggleClock();
    expect(service.clock()).toBe(true);
    expect(service.miniPlayer()).toBe(true);

    service.toggleMiniPlayer();
    expect(service.miniPlayer()).toBe(false);
    expect(service.clock()).toBe(true);
  });
});
