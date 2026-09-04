import { inject, Injectable, signal } from '@angular/core';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { CellGrid, cellGridOf, cellIndexAt } from '@axe/domain/tabletop/fog/cell-grid';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { blockedByTerrain } from '@axe/domain/tabletop/move/blocked-cells';
import { moveBlockMapOn } from '@axe/domain/tabletop/move/move-block-map';
import { moveCellsOf } from '@axe/domain/tabletop/move/move-cells';
import { occupiedCells } from '@axe/domain/tabletop/move/occupied-cells';
import { reachableCells } from '@axe/domain/tabletop/move/reachable-cells';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { surfaceOf } from '@axe/domain/tabletop/tabletop-object';

export interface MoveRangeView {
  characterIdentifier: string;
  grid: CellGrid;
  cells: CellBits;
}

@Injectable({ providedIn: 'root' })
export class MoveRangeService {
  private readonly tableSelecter = inject(TableSelecter);
  private readonly objectStore = inject(ObjectStore);

  readonly range = signal<MoveRangeView | null>(null);

  show(character: GameCharacter): void {
    const view = this.build(character);
    this.range.set(view);
  }

  hide(): void {
    if (this.range() !== null) this.range.set(null);
  }

  private build(character: GameCharacter): MoveRangeView | null {
    const table = this.tableSelecter.viewTable;
    if (!table || !table.moveRangeEnabled) return null;
    if (table.gridSize <= 0 || table.width <= 0 || table.height <= 0) return null;
    if (surfaceOf(character) !== 'floor') return null;

    const walk = moveCellsOf(character, table.moveRangeElementNames, table.cellDistance, table.cellDistanceUnit);
    if (walk === null || walk < 1) return null;

    const grid = cellGridOf(table.width, table.height, table.gridSize, table.gridType);
    const start = startCellOf(grid, character, table);
    if (start < 0) return null;

    const blocked = blockedByTerrain(grid, table.terrains);
    const painted = moveBlockMapOn(table)?.read(grid);
    if (painted) blocked.or(painted);

    const taken = table.piecesShareCells
      ? null
      : occupiedCells(grid, this.objectStore.getObjects<GameCharacter>(GameCharacter), character.identifier);
    const cells = reachableCells(grid, start, walk, (index) => blocked.get(index), {
      cutsCorners: table.moveDiagonally,
      canRest: taken ? (index) => !taken.get(index) : undefined,
    });
    return { characterIdentifier: character.identifier, grid, cells };
  }
}

function startCellOf(grid: CellGrid, character: GameCharacter, table: GameTable): number {
  const half = (table.gridSize * character.size) / 2;
  return cellIndexAt(grid, character.location.x + half, character.location.y + half);
}
