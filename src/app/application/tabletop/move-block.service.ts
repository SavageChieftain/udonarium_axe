import { computed, inject, Injectable, signal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { CellGrid, sameCellGrid } from '@axe/domain/tabletop/fog/cell-grid';
import { ensureMoveBlockMapOn, MoveBlockMap, moveBlockMapOn } from '@axe/domain/tabletop/move/move-block-map';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';

export type MoveBlockBrush = 'block' | 'erase';

const PAINT_FLUSH_MS = 200;

@Injectable({ providedIn: 'root' })
export class MoveBlockService {
  private readonly tableSelecter = inject(TableSelecter);
  private readonly objectChange = inject(ObjectChangeService);

  readonly isPainting = signal(false);
  readonly brush = signal<MoveBlockBrush>('block');

  private readonly strokeVersion = signal(0);
  private pending: { grid: CellGrid; bits: CellBits } | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  readonly canPaint = computed(() => {
    this.objectChange.trackMyCursor();
    return PeerCursor.isMyselfGameMaster;
  });

  startPainting(): void {
    if (!this.canPaint()) return;
    this.isPainting.set(true);
  }

  stopPainting(): void {
    this.endStroke();
    this.isPainting.set(false);
  }

  togglePainting(): void {
    if (this.isPainting()) this.stopPainting();
    else this.startPainting();
  }

  setBrush(brush: MoveBlockBrush): void {
    this.brush.set(brush);
  }

  blockedOn(grid: CellGrid): CellBits | null {
    const map = this.map();
    if (!map) return null;
    return map.read(grid);
  }

  paintedOn(grid: CellGrid): CellBits | null {
    this.strokeVersion();
    this.objectChange.collectionOf(MoveBlockMap.aliasName)();
    const held = this.pending;
    if (held && sameCellGrid(held.grid, grid)) return held.bits;
    const map = this.map();
    if (!map) return null;
    this.objectChange.versionOf(map.identifier)();
    return map.read(grid);
  }

  paintAt(grid: CellGrid, cell: number): void {
    if (!this.canPaint() || !this.isPainting() || cell < 0) return;
    const table = this.tableSelecter.viewTable;
    if (!table) return;
    if (!this.pending || !sameCellGrid(this.pending.grid, grid)) {
      this.pending = { grid, bits: moveBlockMapOn(table)?.read(grid) ?? new CellBits(grid.cols * grid.rows) };
    }
    const wanted = this.brush() === 'block';
    if (this.pending.bits.get(cell) === wanted) return;
    if (wanted) this.pending.bits.set(cell);
    else this.pending.bits.unset(cell);
    this.strokeVersion.update((version) => version + 1);
    this.schedule();
  }

  endStroke(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    this.pending = null;
  }

  clearAll(): void {
    if (!this.canPaint()) return;
    this.pending = null;
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.map()?.reset();
    this.strokeVersion.update((version) => version + 1);
  }

  private map(): MoveBlockMap | null {
    const table = this.tableSelecter.viewTable;
    return table ? moveBlockMapOn(table) : null;
  }

  private schedule(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, PAINT_FLUSH_MS);
  }

  private flush(): void {
    const held = this.pending;
    const table = this.tableSelecter.viewTable;
    if (!held || !table) return;
    ensureMoveBlockMapOn(table).write(held.grid, held.bits);
  }
}
