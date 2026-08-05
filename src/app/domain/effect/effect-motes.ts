import { EffectPreset } from '@axe/domain/effect/effect-preset';

/**
 * 流れの道中に散らす粒。
 *
 * 円錐の形と色だけだと、どの属性でも同じ物が色違いで飛んでいるように見える。
 * 属性ごとに違う物が舞っていると、色を見る前に何が来たか分かる。
 */
export type EffectMote = 'spark' | 'frost' | 'arc' | 'leaf' | 'haze' | 'none';

const MOTE_BY_TAG: Record<string, EffectMote> = {
  炎: 'spark',
  氷: 'frost',
  雷: 'arc',
  風: 'leaf',
  闇: 'haze',
  状態異常: 'haze',
  土: 'spark',
  射撃: 'spark',
  回復: 'frost',
  強化: 'spark',
};

const MOTE_STYLES: readonly EffectMote[] = ['spark', 'frost', 'arc', 'leaf', 'haze', 'none'];

export function isEffectMote(value: unknown): value is EffectMote {
  return typeof value === 'string' && MOTE_STYLES.includes(value as EffectMote);
}

/** 明示されていれば従い、無ければ系統から決める。 */
export function effectMoteOf(preset: EffectPreset): EffectMote {
  if (isEffectMote(preset.moteStyle)) return preset.moteStyle;
  return MOTE_BY_TAG[preset.tagName.trim()] ?? 'spark';
}

export const EFFECT_MOTE_OPTIONS: readonly string[] = ['', ...MOTE_STYLES];
