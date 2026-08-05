import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { EffectPresetSet } from '@axe/domain/effect/effect-preset-set';

describe('EffectPresetSet', () => {
  afterEach(() => {
    for (const preset of ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)) {
      ObjectStore.instance.remove(preset);
    }
  });

  function makePreset(name: string): EffectPreset {
    const preset = new EffectPreset();
    preset.name = name;
    preset.initialize();
    return preset;
  }

  it('今あるエフェクトを全部書き出すこと', () => {
    makePreset('爆炎');
    makePreset('斬撃');

    const xml = new EffectPresetSet().innerXml();

    expect(xml).toContain('爆炎');
    expect(xml).toContain('斬撃');
  });

  it('入れ物自体は残らないこと', () => {
    const set = new EffectPresetSet();
    set.initialize();

    // 書き出し・読み込みの間だけ存在すればよいので、部屋のデータには混ぜない。
    expect(ObjectStore.instance.get(set.identifier)).toBeNull();
  });

  it('読み込んだぶんを足すこと', () => {
    makePreset('元からある');
    const xml = new EffectPresetSet().innerXml();
    const element = new DOMParser().parseFromString(
      `<effect-preset-set>${xml}</effect-preset-set>`,
      'text/xml'
    ).documentElement;
    for (const preset of ObjectStore.instance.getObjects<EffectPreset>(EffectPreset)) {
      ObjectStore.instance.remove(preset);
    }

    new EffectPresetSet().parseInnerXml(element);

    expect(ObjectStore.instance.getObjects<EffectPreset>(EffectPreset).map((preset) => preset.name)).toEqual([
      '元からある',
    ]);
  });
});
