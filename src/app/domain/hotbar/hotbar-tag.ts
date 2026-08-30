import { HotbarCell } from '@axe/domain/hotbar/hotbar-size';

/**
 * What a slot writes on the things it puts out on the table.
 *
 * A slot that lays something out takes that same thing down when it is pressed again, and it
 * has to know it a page later, a reload later, or from another window of the same reader. A
 * mark on what was laid outlives all three, where a note kept in the tab does not.
 */
export function hotbarSlotTag(userId: string, cell: HotbarCell, characterIdentifier: string): string {
  return `hotbar:${userId}:${cell.page}:${cell.slotIndex}:${characterIdentifier}`;
}
