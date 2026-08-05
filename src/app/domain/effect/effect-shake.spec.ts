import { EffectKind } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { effectFlashColor, effectShakeOf } from '@axe/domain/effect/effect-shake';

describe('effectShakeOf()', () => {
  function makePreset(kind: EffectKind, grade: number): EffectPreset {
    const preset = new EffectPreset('preset');
    preset.kind = kind;
    preset.grade = grade;
    preset.colorPrimary = '#dff2ff';
    return preset;
  }

  it('衝撃が来る演出だけ揺らすこと', () => {
    expect(effectShakeOf(makePreset('burst', 3))).toBe('hard');
    expect(effectShakeOf(makePreset('upheaval', 3))).toBe('hard');
    // 回復や障壁まで揺らすと、何が起きても同じ手応えになる。
    expect(effectShakeOf(makePreset('heal', 3))).toBe('');
    expect(effectShakeOf(makePreset('barrier', 3))).toBe('');
  });

  it('等級で強さを分け、初級は揺らさないこと', () => {
    expect(effectShakeOf(makePreset('burst', 1))).toBe('');
    expect(effectShakeOf(makePreset('burst', 2))).toBe('soft');
    expect(effectShakeOf(makePreset('burst', 3))).toBe('hard');
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
