import { EffectPreset } from '@axe/domain/effect/effect-preset';

describe('EffectPreset', () => {
  function makePreset(): EffectPreset {
    return new EffectPreset('preset');
  }

  it('未知の種類は burst として扱うこと', () => {
    const preset = makePreset();
    preset.kind = 'unknown-kind';

    expect(preset.effectKind).toBe('burst');
  });

  it('未知の対象規則は single として扱うこと', () => {
    const preset = makePreset();
    preset.targeting = '';

    expect(preset.effectTargeting).toBe('single');
  });

  it('壊れた数値を既定値に丸めること', () => {
    const preset = makePreset();
    preset.durationMs = Number.NaN;
    preset.scale = Number.NaN;

    expect(preset.duration).toBe(900);
    expect(preset.sizeScale).toBe(1);
  });

  it('長すぎる再生時間と大きすぎる倍率を上限で止めること', () => {
    const preset = makePreset();
    preset.durationMs = 999999;
    preset.scale = 100;

    expect(preset.duration).toBe(6000);
    expect(preset.sizeScale).toBe(6);
  });

  it('単体対象なら対象数を 1 に制限すること', () => {
    const preset = makePreset();
    preset.targeting = 'single';
    preset.maxTargets = 8;

    expect(preset.targetLimit).toBe(1);
  });

  it('複数対象なら設定した上限を使うこと', () => {
    const preset = makePreset();
    preset.targeting = 'multi';
    preset.maxTargets = 8;

    expect(preset.targetLimit).toBe(8);
  });

  it('対象ごとのずらしぶんだけ全体の長さが伸びること', () => {
    const preset = makePreset();
    preset.durationMs = 500;
    preset.staggerMs = 100;

    expect(preset.totalDuration(1)).toBe(500);
    expect(preset.totalDuration(3)).toBe(700);
    expect(preset.totalDuration(0)).toBe(500);
  });

  it('崩れる音を打撃のすぐ後ろに重ねること', () => {
    const preset = new EffectPreset('preset');
    preset.kind = 'dissolve';

    // 間が空くと「ドーン」と「ゴゴゴ」が別々の音に聞こえる。
    expect(preset.impactSoundAt).toBeLessThan(0.15);
  });
});
