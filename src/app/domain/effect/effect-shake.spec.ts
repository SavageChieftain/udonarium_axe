import { EffectKind } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { effectFlashColor, effectShakeAmplitude } from '@axe/domain/effect/effect-shake';

describe('effectShakeAmplitude()', () => {
  function makePreset(kind: EffectKind, grade: number): EffectPreset {
    const preset = new EffectPreset('preset');
    preset.kind = kind;
    preset.grade = grade;
    preset.colorPrimary = '#dff2ff';
    return preset;
  }

  it('衝撃が来る演出だけ揺らすこと', () => {
    expect(effectShakeAmplitude(makePreset('burst', 3))).toBeGreaterThan(0);
    expect(effectShakeAmplitude(makePreset('upheaval', 3))).toBeGreaterThan(0);
    // 回復や障壁まで揺らすと、何が起きても同じ手応えになる。
    expect(effectShakeAmplitude(makePreset('heal', 3))).toBe(0);
    expect(effectShakeAmplitude(makePreset('barrier', 3))).toBe(0);
  });

  it('等級が上がるほど大きく揺らし、初級は揺らさないこと', () => {
    expect(effectShakeAmplitude(makePreset('burst', 1))).toBe(0);
    expect(effectShakeAmplitude(makePreset('burst', 2))).toBeLessThan(effectShakeAmplitude(makePreset('burst', 3)));
  });
});

describe('effectFlashColor()', () => {
  function makePreset(kind: EffectKind, grade: number): EffectPreset {
    const preset = new EffectPreset('preset');
    preset.kind = kind;
    preset.grade = grade;
    preset.colorPrimary = '#dff2ff';
    return preset;
  }

  it('上級の閃光・きのこ雲・極太ビームだけ焼くこと', () => {
    expect(effectFlashColor(makePreset('nova', 3))).toBe('#dff2ff');
    expect(effectFlashColor(makePreset('mushroom', 3))).toBe('#dff2ff');
    expect(effectFlashColor(makePreset('beam', 3))).toBe('#dff2ff');
    expect(effectFlashColor(makePreset('nova', 2))).toBe('');
    expect(effectFlashColor(makePreset('burst', 3))).toBe('');
  });
});
