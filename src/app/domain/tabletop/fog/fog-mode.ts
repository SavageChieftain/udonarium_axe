export const FOG_MODES = ['easy', 'hard'] as const;

export type FogMode = (typeof FOG_MODES)[number];

export const DEFAULT_FOG_MODE: FogMode = 'easy';

export function asFogMode(value: unknown): FogMode {
  return typeof value === 'string' && (FOG_MODES as readonly string[]).includes(value)
    ? (value as FogMode)
    : DEFAULT_FOG_MODE;
}

/**
 * What the fog is made of before anybody says otherwise.
 *
 * Pale, because the fog stands apart from the dark: a lit board wants weather over the part
 * nobody has walked to, not a hole cut in it. A night table sets it dark.
 */
export const DEFAULT_FOG_COLOR = '#aeb9c4';

/**
 * Ground the party has been shown and cannot see now.
 *
 * No mist over it: the fog there has been cleared and stays cleared, and thinning the mist
 * instead read as a lighter fog rather than as a cleared one. It is shaded a little instead,
 * which is what tells it apart from ground somebody is standing in.
 */
export const FOG_VEIL_COLOR = '#000000';

export const FOG_VEIL_ALPHA = 0.3;

export const FOG_UNEXPLORED_ALPHA = 1;

export const FOG_GM_ALPHA_FACTOR = 0.22;

export const FOG_EDGE_BLUR_RATIO = 0.35;
