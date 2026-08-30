export type BuffViewMode = 'icon' | 'detail' | 'count';

export const BUFF_VIEW_MODES: readonly BuffViewMode[] = ['icon', 'detail', 'count'];

export const BUFF_VIEW_LABEL_KEYS: Record<BuffViewMode, string> = {
  icon: 'feature.character.buff.viewIcon',
  detail: 'feature.character.buff.viewDetail',
  count: 'feature.character.buff.viewCount',
};

export function nextBuffViewMode(mode: BuffViewMode): BuffViewMode {
  const at = BUFF_VIEW_MODES.indexOf(mode);
  return BUFF_VIEW_MODES[(at + 1) % BUFF_VIEW_MODES.length];
}

export function isBuffViewMode(value: unknown): value is BuffViewMode {
  return typeof value === 'string' && BUFF_VIEW_MODES.includes(value as BuffViewMode);
}
