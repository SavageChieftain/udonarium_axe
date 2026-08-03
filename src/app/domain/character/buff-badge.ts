import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';

export interface BuffBadge {
  identifier: string;
  icon: string;
  name: string;
  effect: string;
  strength: string;
  rounds: number;
}

const DEFAULT_ICON = '✦';
const STRENGTH_PATTERN = /[+\-−]?\d+(?:\.\d+)?/;

/** 「防+1」「ダメージ2」のような効果欄から強度だけを取り出す。数値が無ければ空。 */
export function parseBuffStrength(effect: string): string {
  const matched = STRENGTH_PATTERN.exec(effect ?? '');
  if (!matched) return '';

  const normalized = matched[0].replace('−', '-');
  return Number(normalized) === 0 ? '' : normalized;
}

export function buffIconOf(element: DataElement): string {
  const icon = (element.getAttribute(DataElementAttribute.BUFF_ICON) ?? '').trim();
  return icon.length > 0 ? icon : DEFAULT_ICON;
}

/** バフ 1 件をアイコン + 強度 + 残ラウンドのバッジに畳む。 */
export function toBuffBadges(buffRoot: DataElement | null): BuffBadge[] {
  if (!buffRoot) return [];

  const badges: BuffBadge[] = [];
  const walk = (element: DataElement) => {
    for (const child of element.children) {
      const data = child as DataElement;
      if (data.children.length > 0) {
        walk(data);
        continue;
      }
      if (!data.isNumberResource) continue;

      const rounds = Number(data.value);
      const effect = `${data.currentValue ?? ''}`;
      badges.push({
        identifier: data.identifier,
        icon: buffIconOf(data),
        name: data.name,
        effect,
        strength: parseBuffStrength(effect),
        rounds: Number.isFinite(rounds) ? rounds : 0,
      });
    }
  };
  walk(buffRoot);
  return badges;
}
