import { effectMoteOf } from '@axe/domain/effect/effect-motes';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

describe('effectMoteOf()', () => {
  function makePreset(tagName: string, moteStyle = ''): EffectPreset {
    const preset = new EffectPreset('preset');
    preset.tagName = tagName;
    preset.moteStyle = moteStyle;
    return preset;
  }

  it('系統から粒を決めること', () => {
    expect(effectMoteOf(makePreset('炎'))).toBe('spark');
    expect(effectMoteOf(makePreset('氷'))).toBe('frost');
    expect(effectMoteOf(makePreset('雷'))).toBe('arc');
    expect(effectMoteOf(makePreset('風'))).toBe('leaf');
    expect(effectMoteOf(makePreset('闇'))).toBe('haze');
  });

  it('明示された指定を優先すること', () => {
    expect(effectMoteOf(makePreset('炎', 'frost'))).toBe('frost');
    expect(effectMoteOf(makePreset('炎', 'none'))).toBe('none');
  });

  it('知らない指定と知らない系統は既定に落とすこと', () => {
    expect(effectMoteOf(makePreset('炎', 'とんでもない値'))).toBe('spark');
    expect(effectMoteOf(makePreset('ドラゴン'))).toBe('spark');
  });
});
