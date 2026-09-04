import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { CellBits, decodeCellBits, encodeCellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid, sameCellGrid } from '@axe/domain/tabletop/fog/cell-grid';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';

@SyncObject('move-block-map')
export class MoveBlockMap extends ObjectNode {
  @SyncVar() cols: number = 0;
  @SyncVar() rows: number = 0;
  @SyncVar() gridType: GridType = GridType.SQUARE;
  @SyncVar() bits: string = '';

  get grid(): CellGrid {
    return { cols: this.cols, rows: this.rows, type: this.gridType, sizePx: 0 };
  }

  matches(grid: CellGrid): boolean {
    return sameCellGrid(this.grid, grid);
  }

  read(grid: CellGrid): CellBits {
    const count = cellCount(grid);
    if (!this.matches(grid)) return new CellBits(count);
    return decodeCellBits(this.bits, count);
  }

  write(grid: CellGrid, bits: CellBits): void {
    this.cols = grid.cols;
    this.rows = grid.rows;
    this.gridType = grid.type;
    this.bits = encodeCellBits(bits);
  }

  reset(): void {
    this.bits = '';
  }

  get isEmpty(): boolean {
    return this.bits.length === 0;
  }
}

export function moveBlockMapOn(table: GameTable): MoveBlockMap | null {
  return table.children.find((child): child is MoveBlockMap => child instanceof MoveBlockMap) ?? null;
}

export function moveBlockMapIdentifierOf(table: GameTable): string {
  return `move-block-map_${table.identifier}`;
}

export function ensureMoveBlockMapOn(table: GameTable): MoveBlockMap {
  const held = moveBlockMapOn(table);
  if (held) return held;
  const map = new MoveBlockMap(moveBlockMapIdentifierOf(table));
  map.initialize();
  table.appendChild(map);
  return map;
}
