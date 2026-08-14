import { TestBed } from '@angular/core/testing';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('EffectPlaybackService', () => {
  let service: EffectPlaybackService;
  let preset: EffectPreset;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(EffectPlaybackService);

    preset = new EffectPreset();
    preset.durationMs = 600;
    ObjectStore.instance.add(preset, false);
  });

  afterEach(() => {
    ObjectStore.instance.remove(preset);
  });

  function cast(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      presetIdentifier: preset.identifier,
      targets: [{ identifier: 'char', x: 0, y: 0, z: 0 }],
      seed: 1,
      ...overrides,
    };
  }

  it('adds a cast that arrives to the list being played', () => {
    expect(service.play(cast())).not.toBeNull();
    expect(service.activeCasts()).toHaveLength(1);
    expect(service.activeCasts()[0].preset).toBe(preset);
  });

  it('ignores a broken cast', () => {
    expect(service.play(null)).toBeNull();
    expect(service.play({ targets: [] })).toBeNull();
    expect(service.activeCasts()).toHaveLength(0);
  });

  it('ignores a cast naming a preset it does not know', () => {
    expect(service.play(cast({ presetIdentifier: 'unknown' }))).toBeNull();
    expect(service.activeCasts()).toHaveLength(0);
  });

  it('plays no more than twelve at once', () => {
    for (let count = 0; count < 20; count++) service.play(cast());

    expect(service.activeCasts()).toHaveLength(12);
  });

  it('shakes the screen only for an effect that lands', () => {
    preset.kind = 'burst';
    preset.grade = 3;
    service.play(cast());

    expect(service.shake()).toBe('hard');
  });

  it('never shakes for healing', () => {
    preset.kind = 'heal';
    preset.grade = 3;
    service.play(cast());

    // Shaking for everything would leave the impact meaning nothing.
    expect(service.shake()).toBe('');
    expect(service.flash()).toBe('');
  });

  it('takes the stronger of two casts in quick succession', () => {
    preset.kind = 'burst';
    preset.grade = 2;
    service.play(cast());
    expect(service.shake()).toBe('soft');

    preset.grade = 3;
    service.play(cast());

    expect(service.shake()).toBe('hard');
  });

  it('tells the piece how to fall when the effect fells it', () => {
    preset.kind = 'bisect';
    service.play(cast());

    expect(service.tokenReactions().get('char')).toBe('bisect');
  });

  it('leaves the piece alone otherwise', () => {
    preset.kind = 'burst';
    service.play(cast());

    expect(service.tokenReactions().size).toBe(0);
  });
});
