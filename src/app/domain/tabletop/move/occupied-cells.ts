import { GameCharacter } from '@axe/domain/character/game-character';
import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid, forEachCellInBox } from '@axe/domain/tabletop/fog/cell-grid';
import { surfaceOf } from '@axe/domain/tabletop/tabletop-object';

/**
 * The ground the pieces already standing on the table take up.
 *
 * A piece covers as many cells as it is wide, so a golem standing three across leaves no
 * room beside itself. The piece being moved is left out: the cell it is on is where it
 * started from.
 */
export function occupiedCells(
  grid: CellGrid,
  characters: readonly GameCharacter[],
  exceptIdentifier: string
): CellBits {
  const bits = new CellBits(cellCount(grid));
  if (grid.sizePx <= 0) return bits;

  for (const character of characters) {
    if (character.identifier === exceptIdentifier) continue;
    if (!character.isVisibleOnTable || surfaceOf(character) !== 'floor') continue;
    const span = Math.max(1, character.size) * grid.sizePx;
    const { x, y } = character.location;
    forEachCellInBox(grid, x, y, x + span - 1, y + span - 1, (cell) => bits.set(cell));
  }
  return bits;
}
