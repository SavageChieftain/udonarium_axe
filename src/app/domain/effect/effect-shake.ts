import { EffectKind } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

/**
 * Shaking the screen.
 *
 * Only what lands a blow, such as an explosion or a strike, shakes it.
 * Shaking for healing and shields too would give everything the same weight and leave none of it heavy.
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
  'ballistic',
]);

/**
 * How hard it shakes, held as a step rather than a distance.
 * Passed as a css variable, rewriting an inherited variable would void every style under the board.
 */
export type EffectShake = '' | 'soft' | 'hard';

const SHAKE_BY_GRADE: Record<1 | 2 | 3, EffectShake> = { 1: '', 2: 'soft', 3: 'hard' };

/** How hard the screen shakes. Empty for not at all. */
export function effectShakeOf(preset: EffectPreset): EffectShake {
  if (!SHAKING_KINDS.has(preset.effectKind)) return '';
  return SHAKE_BY_GRADE[preset.gradeLevel];
}

/**
 * How long before it shakes. Shaking anywhere but the moment of the blow makes the one who fired look struck.
 */
export function effectShakeDelay(preset: EffectPreset): number {
  if (preset.effectKind !== 'ballistic') return 0;
  return Math.round(preset.duration * preset.impactSoundAt);
}

/** The colour of the flash. Only the highest flash, the mushroom cloud and the heaviest beam burn the whole screen. */
export function effectFlashColor(preset: EffectPreset): string {
  if (preset.gradeLevel < 3) return '';
  if (preset.effectKind !== 'nova' && preset.effectKind !== 'mushroom' && preset.effectKind !== 'beam') return '';
  return preset.colorPrimary;
}
