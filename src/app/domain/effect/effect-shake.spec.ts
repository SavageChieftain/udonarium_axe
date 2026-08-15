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

  it('shakes only for an effect that lands a blow', () => {
    expect(effectShakeOf(makePreset('burst', 3))).toBe('hard');
    expect(effectShakeOf(makePreset('upheaval', 3))).toBe('hard');
    // Shaking for healing and shields too would give everything the same weight.
    expect(effectShakeOf(makePreset('heal', 3))).toBe('');
    expect(effectShakeOf(makePreset('barrier', 3))).toBe('');
  });

  it('shakes harder at the higher grades and not at all at the lowest', () => {
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

  it('burns the screen only for the highest flash, the mushroom cloud and the heaviest beam', () => {
    expect(effectFlashColor(makePreset('nova', 3))).toBe('#dff2ff');
    expect(effectFlashColor(makePreset('mushroom', 3))).toBe('#dff2ff');
    expect(effectFlashColor(makePreset('beam', 3))).toBe('#dff2ff');
    expect(effectFlashColor(makePreset('nova', 2))).toBe('');
    expect(effectFlashColor(makePreset('burst', 3))).toBe('');
  });
});
