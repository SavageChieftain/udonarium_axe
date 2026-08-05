import { ResourceChangeKind, ResourceChangeSeverity } from '@axe/domain/character/resource-change';

/**
 * リソース増減に自動で当てる演出。
 *
 * ダメージは殴打（打撃）、回復は回復光を規模で段階付ける。
 * 属性が分からない自動割り当てなので、系統色の付かない汎用の演出を選ぶ。
 */
const AUTO_EFFECT_IDENTIFIERS: Record<ResourceChangeKind, Record<ResourceChangeSeverity, string>> = {
  damage: {
    small: 'EffectPreset_bash_1',
    medium: 'EffectPreset_bash_2',
    large: 'EffectPreset_bash_3',
  },
  heal: {
    small: 'EffectPreset_heal_1',
    medium: 'EffectPreset_heal_2',
    large: 'EffectPreset_heal_3',
  },
};

export function autoEffectIdentifier(kind: ResourceChangeKind, severity: ResourceChangeSeverity): string {
  return AUTO_EFFECT_IDENTIFIERS[kind][severity];
}
