import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoveRangeService } from '@axe/application/tabletop/move-range.service';
import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellGridOf, cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GridType } from '@axe/domain/tabletop/game-table';
import {
  MOVE_RANGE_FILL,
  MOVE_ZOC_FILL,
  TableMoveRangeOverlayComponent,
} from '@axe/features/tabletop/table-move-range-overlay/table-move-range-overlay.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TableMoveRangeOverlayComponent', () => {
  let fixture: ComponentFixture<TableMoveRangeOverlayComponent>;
  let filled: string[];

  const grid = cellGridOf(6, 6, 50, GridType.SQUARE);

  function cellsAt(...indexes: number[]): CellBits {
    const bits = new CellBits(grid.cols * grid.rows);
    for (const index of indexes) bits.set(index);
    return bits;
  }

  beforeEach(() => {
    filled = [];
    // happy-dom draws nothing, so the paths are shapes the canvas is merely handed.
    vi.stubGlobal(
      'Path2D',
      class {
        moveTo(): void {}
        lineTo(): void {}
        closePath(): void {}
      }
    );
    const context = {
      setTransform: () => undefined,
      clearRect: () => undefined,
      fill: () => filled.push(String(context.fillStyle)),
      stroke: () => undefined,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineJoin: '',
      lineCap: '',
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as null);

    TestBed.configureTestingModule({ imports: [TableMoveRangeOverlayComponent], providers: [...TEST_PROVIDERS] });
    fixture = TestBed.createComponent(TableMoveRangeOverlayComponent);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('paints the ground an enemy holds under the reach', () => {
    TestBed.inject(MoveRangeService).range.set({
      characterIdentifier: 'piece',
      grid,
      cells: cellsAt(cellIndexOf(grid, 2, 2)),
      held: cellsAt(cellIndexOf(grid, 3, 3)),
    });

    fixture.detectChanges();

    expect(filled).toEqual([MOVE_ZOC_FILL, MOVE_RANGE_FILL]);
  });

  it('paints the reach alone where no enemy holds any', () => {
    TestBed.inject(MoveRangeService).range.set({
      characterIdentifier: 'piece',
      grid,
      cells: cellsAt(cellIndexOf(grid, 2, 2)),
      held: null,
    });

    fixture.detectChanges();

    expect(filled).toEqual([MOVE_RANGE_FILL]);
  });
});
