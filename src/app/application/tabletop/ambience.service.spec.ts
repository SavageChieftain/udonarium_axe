import { TestBed } from '@angular/core/testing';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { AmbienceService, storedAmbienceFrameStepMs } from '@axe/application/tabletop/ambience.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('AmbienceService', () => {
  let service: AmbienceService;
  let playback: EffectPlaybackService;

  beforeEach(() => {
    localStorage.removeItem('ui-ambience-frame-step');
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(AmbienceService);
    playback = TestBed.inject(EffectPlaybackService);
  });

  afterEach(() => {
    localStorage.removeItem('ui-ambience-frame-step');
    TestBed.resetTestingModule();
  });

  it('follows the effect clock exactly by default', () => {
    playback.now.set(1234.5);
    expect(service.now()).toBe(1234.5);
  });

  it('holds the clock on a step once one is chosen', () => {
    service.frameStepMs.set(33);

    playback.now.set(100);
    expect(service.now()).toBe(99);
    playback.now.set(131);
    expect(service.now()).toBe(99);
    playback.now.set(132);
    expect(service.now()).toBe(132);
  });

  it('reads the step from the browser, and takes nothing unusable', () => {
    localStorage.setItem('ui-ambience-frame-step', '33');
    expect(storedAmbienceFrameStepMs()).toBe(33);
    localStorage.setItem('ui-ambience-frame-step', 'fast');
    expect(storedAmbienceFrameStepMs()).toBe(0);
    localStorage.setItem('ui-ambience-frame-step', '-5');
    expect(storedAmbienceFrameStepMs()).toBe(0);
  });
});
