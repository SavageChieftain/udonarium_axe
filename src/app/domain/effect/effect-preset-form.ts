import {
  EffectKind,
  EffectTargeting,
  PROJECTILE_STYLES,
  ProjectileStyle,
  SlashStyle,
} from '@axe/domain/effect/effect-kind';

/**
 * The choices the editor offers, and which fields mean anything to which kind.
 *
 * Some kinds have no use for some fields, such as a count of shots on a cut, and what to
 * show is decided here so the screen carries no branching.
 */

export const EFFECT_TARGETING_OPTIONS: readonly EffectTargeting[] = ['self', 'single', 'multi'];

export const PROJECTILE_STYLE_OPTIONS: readonly ProjectileStyle[] = PROJECTILE_STYLES;

export const SLASH_STYLE_OPTIONS: readonly SlashStyle[] = ['single', 'combo', 'iai', 'wide', 'heavy'];

export const EFFECT_GRADE_OPTIONS: readonly number[] = [1, 2, 3];

/** The kinds that fly, from an origin to a target, and so need a look and a landing. */
export function usesProjectileFields(kind: EffectKind): boolean {
  return kind === 'projectile';
}

/** The kinds that have a form of cut. */
export function usesSlashFields(kind: EffectKind): boolean {
  return kind === 'slash';
}

/** The kinds that fire in bursts, several shots to one firing. */
export function usesShotFields(kind: EffectKind): boolean {
  return kind === 'projectile';
}

/** The kinds that hand the landing to another effect. */
export function usesImpactKindField(kind: EffectKind): boolean {
  return kind === 'projectile';
}

/** The kinds that need an origin, whose direction is undecided until a caster is chosen. */
export function needsCaster(kind: EffectKind): boolean {
  return (
    kind === 'projectile' ||
    kind === 'beam' ||
    kind === 'breath' ||
    kind === 'drain' ||
    kind === 'arc' ||
    kind === 'skyblade' ||
    kind === 'raybeam' ||
    kind === 'arrowrain' ||
    kind === 'ballistic'
  );
}

/** Whether it takes several targets, which decides whether the limit may be edited. */
export function usesTargetLimit(targeting: EffectTargeting): boolean {
  return targeting === 'multi';
}

/** The name of a copy. Two of a name cannot be told apart in the list. */
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
