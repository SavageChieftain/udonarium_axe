/**
 * Where things sit, one above another, on top of the table.
 *
 * The table itself is sealed in its own stacking context, so anything here floats over it.
 * The rest of the ladder, for reference: panels and cut-in windows 1-10 (201 full screen),
 * widgets 100, hand rail 140, toolbars 150, mobile shell 160, menu FAB 200, context menu
 * 9900, drag ghosts 10000, modal 1899999, dropdowns and text tooltips 2000000.
 *
 * Panels are numbered as they are brought forward rather than given a shelf of their own, so
 * anything that must sit above a particular panel says which shelf it wants.
 */
export const Z_HOTBAR = 150;
export const Z_HOTBAR_MOBILE = 155;

/**
 * Above the modal, and only when the reader pins it there.
 *
 * A modal's backdrop is a child of the modal, and only answers a press that lands on itself,
 * so nothing has to be done to it for a bar above to take its own presses. Kept below the
 * dropdowns and text tooltips at 2000000, which belong to whatever the reader opened last.
 */
export const Z_HOTBAR_PINNED = 1_900_000;

/**
 * The menu a pinned bar opens, which has to clear the bar it belongs to.
 *
 * A context menu sits at 9900, under everything a pinned bar is above, so a menu opened from
 * one would otherwise be hidden behind it. This is the one exception: the menu that belongs
 * to the pinned bar rides just above it, and everything else keeps its usual place.
 */
export const Z_CONTEXT_MENU_PINNED = Z_HOTBAR_PINNED + 10;

/**
 * A panel the bar opens itself, which has to clear the bar it was opened from.
 *
 * Panels are numbered from one as they are brought forward, so one opened from the bar would
 * otherwise be hidden behind it - the reader presses a slot and the editor appears under the
 * thing they pressed. This is the exception: a panel the bar opens rides just above it,
 * wherever the bar happens to be sitting, and every other panel keeps its usual place.
 */
export function hotbarPanelLayer(pinned: boolean): number {
  return (pinned ? Z_HOTBAR_PINNED : Z_HOTBAR) + 1;
}
