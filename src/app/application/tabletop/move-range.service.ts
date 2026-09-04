import { inject, Injectable, signal } from '@angular/core';
import { VisionService } from '@axe/application/tabletop/vision.service';
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
import { asZocMode, isHostileTo, zoneOfControl } from '@axe/domain/tabletop/move/zone-of-control';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { surfaceOf } from '@axe/domain/tabletop/tabletop-object';

export interface MoveRangeView {
  characterIdentifier: string;
  grid: CellGrid;
  cells: CellBits;
  /** The ground the enemies hold, which is why the reach stops where it does. */
  held: CellBits | null;
}

@Injectable({ providedIn: 'root' })
export class MoveRangeService {
  private readonly tableSelecter = inject(TableSelecter);
  private readonly objectStore = inject(ObjectStore);
  private readonly vision = inject(VisionService);

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

    const standing = this.objectStore.getObjects<GameCharacter>(GameCharacter);
    // Two pieces that may not share a cell may not pass through one either: the ground
    // somebody stands on is in the way, and a reach has to go round it.
    if (!table.piecesShareCells) blocked.or(occupiedCells(grid, standing, character.identifier));

    const mode = asZocMode(table.zocMode);
    const held = mode === 'none' ? null : this.heldGroundAround(grid, character, standing, table);
    if (held && mode === 'block') blocked.or(held);
    const extra = Math.max(0, Math.floor(table.zocExtraCost));

    const cells = reachableCells(grid, start, walk, (index) => blocked.get(index), {
      cutsCorners: table.moveDiagonally,
      costOf: held && mode === 'cost' ? (index) => (held.get(index) ? 1 + extra : 1) : undefined,
      stopsAt: held && mode === 'stop' ? (index) => held.get(index) : undefined,
    });
    return { characterIdentifier: character.identifier, grid, cells, held };
  }

  /**
   * The ground the enemies on the board hold against this piece.
   *
   * Only the ones the person moving can see hold any: a range with a bite taken out of it
   * where nobody is standing tells the table there is something in the dark there, which is
   * the one thing the fog is for.
   */
  private heldGroundAround(
    grid: CellGrid,
    mover: GameCharacter,
    standing: readonly GameCharacter[],
    table: GameTable
  ): CellBits | null {
    const foes = standing.filter((piece) => isHostileTo(piece, mover) && this.vision.isTokenVisible(piece));
    const held = zoneOfControl(grid, foes, table.zocRange, table.moveDiagonally);
    return held.isEmpty ? null : held;
  }
}

function startCellOf(grid: CellGrid, character: GameCharacter, table: GameTable): number {
  const half = (table.gridSize * character.size) / 2;
  return cellIndexAt(grid, character.location.x + half, character.location.y + half);
}
