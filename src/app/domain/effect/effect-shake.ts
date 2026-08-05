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

/**
 * 揺れの強さ。幅を数値で持たず段階で持つ。
 * 幅を CSS 変数で渡すと、継承する変数の書き換えで盤面配下の style が全て無効になる。
 */
export type EffectShake = '' | 'soft' | 'hard';

const SHAKE_BY_GRADE: Record<1 | 2 | 3, EffectShake> = { 1: '', 2: 'soft', 3: 'hard' };

/** 画面の揺れの強さ。空なら揺らさない。 */
export function effectShakeOf(preset: EffectPreset): EffectShake {
  if (!SHAKING_KINDS.has(preset.effectKind)) return '';
  return SHAKE_BY_GRADE[preset.gradeLevel];
}

/** 閃光の色。上級の閃光・きのこ雲・極太ビームだけ画面全体を焼く。 */
export function effectFlashColor(preset: EffectPreset): string {
  if (preset.gradeLevel < 3) return '';
  if (preset.effectKind !== 'nova' && preset.effectKind !== 'mushroom' && preset.effectKind !== 'beam') return '';
  return preset.colorPrimary;
}
