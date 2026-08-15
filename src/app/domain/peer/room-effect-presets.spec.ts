import { ObjectStore } from '@axe/core/sync/object-store';
import { createDefaultEffectPresets, DEFAULT_EFFECT_PRESET_SEEDS } from '@axe/domain/effect/builtin-effect-presets';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

describe('createDefaultEffectPresets()', () => {
  afterEach(() => {
    for (const preset of ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)) {
      ObjectStore.instance.delete(preset, false);
    }
    ObjectStore.instance.clearDeleteHistory();
  });

  it('makes a full set of the usual effects', () => {
    createDefaultEffectPresets();

    expect(ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)).toHaveLength(
      DEFAULT_EFFECT_PRESET_SEEDS.length
    );
  });

  it('makes them again after they have been deleted', () => {
    for (const preset of createDefaultEffectPresets()) preset.destroy();

    createDefaultEffectPresets();

    // A deleted identifier cannot be used again, so as it stands not one would come back.
    expect(ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)).toHaveLength(
      DEFAULT_EFFECT_PRESET_SEEDS.length
    );
  });
});
