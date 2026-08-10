import {
  EffectKind,
  EffectTargeting,
  PROJECTILE_STYLES,
  ProjectileStyle,
  SlashStyle,
} from '@axe/domain/effect/effect-kind';

/**
 * プリセット編集で見せる選択肢と、種類ごとに意味を持つ項目の判定。
 *
 * 種類によっては使わない項目（斬撃に弾数など）があるので、
 * 出す・出さないをここで決めて画面から分岐を追い出す。
 */

export const EFFECT_TARGETING_OPTIONS: readonly EffectTargeting[] = ['self', 'single', 'multi'];

export const PROJECTILE_STYLE_OPTIONS: readonly ProjectileStyle[] = PROJECTILE_STYLES;

export const SLASH_STYLE_OPTIONS: readonly SlashStyle[] = ['single', 'combo', 'iai', 'wide', 'heavy'];

export const EFFECT_GRADE_OPTIONS: readonly number[] = [1, 2, 3];

/** 飛んでいく種類。発射元から対象へ向かうので、見た目と着弾の設定が要る。 */
export function usesProjectileFields(kind: EffectKind): boolean {
  return kind === 'projectile';
}

/** 斬撃の型を持つ種類。 */
export function usesSlashFields(kind: EffectKind): boolean {
  return kind === 'slash';
}

/** 連射できる種類。1 回の発動で複数回撃つ。 */
export function usesShotFields(kind: EffectKind): boolean {
  return kind === 'projectile';
}

/** 着弾で別の演出へ委譲する種類。 */
export function usesImpactKindField(kind: EffectKind): boolean {
  return kind === 'projectile';
}

/** 発射元を要求する種類。撃ち手を選んでいないと向きが決まらない。 */
export function needsCaster(kind: EffectKind): boolean {
  return kind === 'projectile' || kind === 'beam' || kind === 'breath' || kind === 'drain' || kind === 'arc';
}

/** 複数を狙える設定か。上限を編集させるかどうかの判定に使う。 */
export function usesTargetLimit(targeting: EffectTargeting): boolean {
  return targeting === 'multi';
}

/** 複製したときの名前。同じ名前が並ぶと一覧で見分けられない。 */
export function duplicatedEffectName(name: string, existing: readonly string[]): string {
  const base = name.trim().length > 0 ? name.trim() : '無題';
  const taken = new Set(existing);
  if (!taken.has(base)) return base;

  for (let index = 2; index < 100; index++) {
    const candidate = `${base} (${index})`;
    if (!taken.has(candidate)) return candidate;
  }
  return base;
}
