import { DEFAULT_BUFF_COLOR } from '@axe/domain/character/buff-appearance';
import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';

export interface BuffBadge {
  identifier: string;
  icon: string;
  name: string;
  effect: string;
  strength: string;
  rounds: number;
  color: string;
}

const DEFAULT_ICON = '✦';
const STRENGTH_PATTERN = /[+\-−]?\d+(?:\.\d+)?/;

/** Takes the strength alone out of an effect field. Empty when there is no number. */
export function parseBuffStrength(effect: string): string {
  const matched = STRENGTH_PATTERN.exec(effect ?? '');
  if (!matched) return '';

  const normalized = matched[0].replace('−', '-');
  return Number(normalized) === 0 ? '' : normalized;
}

export function buffColorOf(element: DataElement): string {
  const color = (element.getAttribute(DataElementAttribute.BUFF_COLOR) ?? '').trim();
  return color.length > 0 ? color : DEFAULT_BUFF_COLOR;
}

export function buffIconOf(element: DataElement): string {
  const icon = (element.getAttribute(DataElementAttribute.BUFF_ICON) ?? '').trim();
  return icon.length > 0 ? icon : DEFAULT_ICON;
}

/** Folds one buff into a badge of its icon, its strength and the rounds left. */
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
        color: buffColorOf(data),
      });
    }
  };
  walk(buffRoot);
  return badges;
}
