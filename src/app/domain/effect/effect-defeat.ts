import { EffectKind } from '@axe/domain/effect/effect-kind';

/**
 * 倒れたコマ自身の反応。
 *
 * 崩壊や両断は、周りに演出を出すだけでは「倒れた」ことにならない。
 * コマ自体が崩れ落ちる／ずれて消える必要があるので、コマ側へ渡す合図を決める。
 */
export type DefeatReaction = '' | 'dissolve' | 'bisect' | 'flinch';

const REACTION_BY_KIND: Partial<Record<EffectKind, DefeatReaction>> = {
  dissolve: 'dissolve',
  bisect: 'bisect',
  gore: 'flinch',
};

export function defeatReactionOf(kind: EffectKind): DefeatReaction {
  return REACTION_BY_KIND[kind] ?? '';
}
