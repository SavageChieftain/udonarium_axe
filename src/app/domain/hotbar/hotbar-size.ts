export const HOTBAR_SLOTS_PER_PAGE = 10;
export const HOTBAR_PAGES = 5;

export interface HotbarCell {
  page: number;
  slotIndex: number;
}

/** Whether the bar has such a cell at all, which a number read off a file may not name. */
export function holdsHotbarCell(cell: HotbarCell): boolean {
  if (!Number.isInteger(cell.page) || !Number.isInteger(cell.slotIndex)) return false;
  return 0 <= cell.page && cell.page < HOTBAR_PAGES && 0 <= cell.slotIndex && cell.slotIndex < HOTBAR_SLOTS_PER_PAGE;
}
