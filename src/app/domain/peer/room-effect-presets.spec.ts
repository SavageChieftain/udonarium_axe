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

  it('既定の演出を一式作ること', () => {
    createDefaultEffectPresets();

    expect(ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)).toHaveLength(
      DEFAULT_EFFECT_PRESET_SEEDS.length
    );
  });

  it('一度消したあとでも作り直せること', () => {
    for (const preset of createDefaultEffectPresets()) preset.destroy();

    createDefaultEffectPresets();

    // 消された identifier は再利用できないので、そのままでは 1 つも戻らない。
    expect(ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)).toHaveLength(
      DEFAULT_EFFECT_PRESET_SEEDS.length
    );
  });
});
