export const VN_PORTRAIT_POS_UNSET = -1;
export const VN_PORTRAIT_SLOT_COUNT = 12;

export function isVnPortraitPosSet(pos: number): boolean {
  return pos >= 0 && pos < VN_PORTRAIT_SLOT_COUNT;
}

/** Older saved data keeps positions as attribute strings, so a number has to be coaxed out. */
export function toPortraitSlot(value: unknown): number | null {
  if (value == null || value === '') return null;
  const pos = Number(value);
  if (!Number.isFinite(pos)) return null;
  const slot = Math.round(pos);
  return isVnPortraitPosSet(slot) ? slot : null;
}
