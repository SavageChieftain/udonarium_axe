import { EffectKind } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

/**
 * 画面を揺らす演出。
 *
 * 爆発や打撃のように「衝撃が来る」ものだけ揺らす。
 * 回復や障壁まで揺らすと、何が起きても同じ手応えになって重みが無くなる。
 */
const SHAKING_KINDS: ReadonlySet<EffectKind> = new Set<EffectKind>([
  'burst',
  'nova',
  'mushroom',
  'impact',
  'rubble',
  'upheaval',
  'bash',
  'beam',
  'gravity',
  'bolt',
]);

/** 等級ごとの揺れ幅(px)。 */
const SHAKE_AMPLITUDE: Record<1 | 2 | 3, number> = { 1: 0, 2: 5, 3: 11 };

/** 画面の揺れ幅(px)。0 なら揺らさない。 */
export function effectShakeAmplitude(preset: EffectPreset): number {
  if (!SHAKING_KINDS.has(preset.effectKind)) return 0;
  return SHAKE_AMPLITUDE[preset.gradeLevel];
}

/** 閃光の色。上級の閃光・きのこ雲・極太ビームだけ画面全体を焼く。 */
export function effectFlashColor(preset: EffectPreset): string {
  if (preset.gradeLevel < 3) return '';
  if (preset.effectKind !== 'nova' && preset.effectKind !== 'mushroom' && preset.effectKind !== 'beam') return '';
  return preset.colorPrimary;
}
