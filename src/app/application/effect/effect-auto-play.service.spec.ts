import { TestBed } from '@angular/core/testing';
import { EffectAutoPlayService } from '@axe/application/effect/effect-auto-play.service';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ResourceChange } from '@axe/domain/character/resource-change';
import { createEffectPreset, DEFAULT_EFFECT_PRESET_SEEDS } from '@axe/domain/effect/builtin-effect-presets';
import { autoEffectIdentifier } from '@axe/domain/effect/resource-effect-map';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('EffectAutoPlayService', () => {
  let service: EffectAutoPlayService;
  let playback: { play: ReturnType<typeof vi.fn> };
  let character: GameCharacter;

  function change(kind: 'damage' | 'heal', ratio: number): ResourceChange {
    return { identifier: 'HP', name: 'HP', kind, delta: kind === 'damage' ? -10 : 10, label: '-10', ratio };
  }

  beforeEach(() => {
    localStorage.clear();
    playback = { play: vi.fn().mockReturnValue({}) };
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(EffectPlaybackService, { useValue: playback });
    service = TestBed.inject(EffectAutoPlayService);

    for (const seed of DEFAULT_EFFECT_PRESET_SEEDS) createEffectPreset(seed, seed.identifier);
    character = GameCharacter.create('的', 1, '');
  });

  afterEach(() => {
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.delete(object, false);
    ObjectStore.instance.clearDeleteHistory();
    localStorage.clear();
  });

  it('既定では出さないこと', () => {
    // 卓ごとに好みが割れるので、黙って増えないようにする。
    expect(service.enabled()).toBe(false);
    expect(service.play(character, [change('damage', 0.5)])).toBe(false);
    expect(playback.play).not.toHaveBeenCalled();
  });

  it('入りにすると規模に合う演出を出すこと', () => {
    service.setEnabled(true);

    expect(service.play(character, [change('damage', 0.5)])).toBe(true);
    expect(playback.play.mock.calls[0][0].presetIdentifier).toBe(autoEffectIdentifier('damage', 'large'));

    expect(service.play(character, [change('heal', 0.05)])).toBe(true);
    expect(playback.play.mock.calls[1][0].presetIdentifier).toBe(autoEffectIdentifier('heal', 'small'));
  });

  it('ダメージと回復が混ざったらダメージを優先すること', () => {
    service.setEnabled(true);

    service.play(character, [change('heal', 0.5), change('damage', 0.5)]);

    expect(playback.play.mock.calls[0][0].presetIdentifier).toBe(autoEffectIdentifier('damage', 'large'));
  });

  it('増減が無ければ何もしないこと', () => {
    service.setEnabled(true);

    expect(service.play(character, [])).toBe(false);
  });

  it('設定を覚えること', () => {
    service.setEnabled(true);

    expect(localStorage.getItem('axe.effect.autoPlay')).toBe('on');
    expect(TestBed.inject(EffectAutoPlayService).enabled()).toBe(true);
  });
});
