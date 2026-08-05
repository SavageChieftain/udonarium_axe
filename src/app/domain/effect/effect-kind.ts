export type EffectKind =
  | 'slash'
  | 'projectile'
  | 'burst'
  | 'flame'
  | 'nova'
  | 'mushroom'
  | 'heal'
  | 'impact'
  | 'rubble'
  | 'upheaval'
  | 'bolt'
  | 'frost'
  | 'vortex'
  | 'miasma'
  | 'aura'
  | 'breath'
  | 'barrier'
  | 'drain'
  | 'warp'
  | 'gravity'
  | 'arc'
  | 'bash'
  | 'curse'
  | 'beam';

export type EffectTargeting = 'self' | 'single' | 'multi';

/**
 * 斬撃の型。等級ではなく型で太刀筋が決まる。
 * single=一太刀 / combo=連撃 / iai=居合 / wide=薙ぎ払い / heavy=唐竹割り
 */
export type SlashStyle = 'single' | 'combo' | 'iai' | 'wide' | 'heavy';

const SLASH_STYLES: readonly SlashStyle[] = ['single', 'combo', 'iai', 'wide', 'heavy'];
const SLASH_STYLE_SET = new Set<string>(SLASH_STYLES);

export function isSlashStyle(value: unknown): value is SlashStyle {
  return typeof value === 'string' && SLASH_STYLE_SET.has(value);
}

/** 飛翔体の見た目。魔法弾は光り、矢と銃弾は実体として飛ぶ。 */
export type ProjectileStyle = 'bolt' | 'arrow' | 'bullet';

export const EFFECT_KINDS: readonly EffectKind[] = [
  'slash',
  'projectile',
  'burst',
  'flame',
  'nova',
  'mushroom',
  'heal',
  'impact',
  'rubble',
  'upheaval',
  'bolt',
  'frost',
  'vortex',
  'miasma',
  'aura',
  'breath',
  'barrier',
  'drain',
  'warp',
  'gravity',
  'arc',
  'bash',
  'curse',
  'beam',
];

export const EFFECT_TARGETINGS: readonly EffectTargeting[] = ['self', 'single', 'multi'];

const EFFECT_KIND_SET = new Set<string>(EFFECT_KINDS);
const EFFECT_TARGETING_SET = new Set<string>(EFFECT_TARGETINGS);

export function isEffectKind(value: unknown): value is EffectKind {
  return typeof value === 'string' && EFFECT_KIND_SET.has(value);
}

export function isEffectTargeting(value: unknown): value is EffectTargeting {
  return typeof value === 'string' && EFFECT_TARGETING_SET.has(value);
}
