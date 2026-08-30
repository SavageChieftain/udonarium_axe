import { TestBed } from '@angular/core/testing';
import { parseWidgetVisibility, WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { beforeEach, describe, expect, it } from 'vitest';

describe('parseWidgetVisibility', () => {
  it('shows only the mini player with nothing saved', () => {
    expect(parseWidgetVisibility(null)).toEqual({
      clock: false,
      miniPlayer: true,
      connectionQuality: false,
      recording: true,
      renderStats: false,
      hotbar: false,
    });
  });

  it('reads the saved state', () => {
    expect(
      parseWidgetVisibility('{"clock":true,"miniPlayer":false,"connectionQuality":true,"recording":false}')
    ).toEqual({
      clock: true,
      miniPlayer: false,
      connectionQuality: true,
      recording: false,
      renderStats: false,
      hotbar: false,
    });
  });

  it('falls back to the defaults for a broken value', () => {
    expect(parseWidgetVisibility('{')).toEqual({
      clock: false,
      miniPlayer: true,
      connectionQuality: false,
      recording: true,
      renderStats: false,
      hotbar: false,
    });
    expect(parseWidgetVisibility('null')).toEqual({
      clock: false,
      miniPlayer: true,
      connectionQuality: false,
      recording: true,
      renderStats: false,
      hotbar: false,
    });
  });

  it('fills in only the missing entries', () => {
    expect(parseWidgetVisibility('{"clock":true}')).toEqual({
      clock: true,
      miniPlayer: true,
      connectionQuality: false,
      recording: true,
      renderStats: false,
      hotbar: false,
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

  it('shows only the mini player by default', () => {
    expect(service.clock()).toBe(false);
    expect(service.miniPlayer()).toBe(true);
    expect(service.connectionQuality()).toBe(false);
    expect(service.recording()).toBe(true);
    expect(service.renderStats()).toBe(false);
    expect(service.hotbar()).toBe(false);
  });

  it('toggles each one independently', () => {
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

    service.toggleHotbar();
    expect(service.hotbar()).toBe(true);
    expect(service.connectionQuality()).toBe(true);
  });
});
