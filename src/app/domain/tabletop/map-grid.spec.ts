import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCellCenter, hexSpacing } from '@axe/domain/tabletop/hex-geometry';
import {
  blockOrigin,
  boardExtentPx,
  boardSizeOn,
  cellCentre,
  MapGrid,
  mergeSpanFor,
  tableSizeFor,
} from '@axe/domain/tabletop/map-grid';

const squares: MapGrid = { type: GridType.SQUARE, sizePx: 50 };
const flatTop: MapGrid = { type: GridType.HEX_VERTICAL, sizePx: 50 };
const pointyTop: MapGrid = { type: GridType.HEX_HORIZONTAL, sizePx: 50 };

describe('mergeSpanFor()', () => {
  it('lets squares be gathered into rectangles', () => {
    expect(mergeSpanFor(squares, 12)).toBe(12);
  });

  it('gives every hex a block of its own, hexes not tiling into rectangles', () => {
    expect(mergeSpanFor(flatTop, 12)).toBe(1);
    expect(mergeSpanFor(pointyTop, 12)).toBe(1);
  });
});

describe('blockOrigin()', () => {
  it('puts a square block on the corner of its cell', () => {
    expect(blockOrigin({ x: 3, y: 2, w: 4, h: 1 }, squares)).toEqual({ x: 150, y: 100 });
  });

  it('hangs a hex block round the middle of its hex, where a piece of that size sits', () => {
    const { colSpacing, rowSpacing } = hexSpacing(50, true);
    const middle = hexCellCenter(3, 2, colSpacing, rowSpacing, true);

    expect(blockOrigin({ x: 3, y: 2, w: 1, h: 1 }, flatTop)).toEqual({ x: middle.x - 25, y: middle.y - 25 });
  });

  it('staggers the hexes, which is the whole of what makes them hexes', () => {
    const even = blockOrigin({ x: 2, y: 0, w: 1, h: 1 }, flatTop);
    const odd = blockOrigin({ x: 3, y: 0, w: 1, h: 1 }, flatTop);

    expect(odd.y).not.toBe(even.y);
  });

  it('staggers the other way round for the other hex grid', () => {
    const even = blockOrigin({ x: 0, y: 2, w: 1, h: 1 }, pointyTop);
    const odd = blockOrigin({ x: 0, y: 3, w: 1, h: 1 }, pointyTop);

    expect(odd.x).not.toBe(even.x);
    expect(blockOrigin({ x: 2, y: 0, w: 1, h: 1 }, pointyTop).y).toBe(
      blockOrigin({ x: 3, y: 0, w: 1, h: 1 }, pointyTop).y
    );
  });
});

describe('cellCentre()', () => {
  it('is the middle of a square cell rather than its corner', () => {
    expect(cellCentre({ x: 0, y: 0 }, squares)).toEqual({ x: 25, y: 25 });
  });

  it('is the middle of a hex, which the geometry already knows', () => {
    const { colSpacing, rowSpacing } = hexSpacing(50, false);

    expect(cellCentre({ x: 1, y: 3 }, pointyTop)).toEqual(hexCellCenter(1, 3, colSpacing, rowSpacing, false));
  });
});

describe('boardSizeOn()', () => {
  it('leaves a board of squares the size it was asked for', () => {
    expect(boardSizeOn({ width: 40, height: 30 }, squares)).toEqual({ width: 40, height: 30 });
  });

  it('cuts a hex board down, since every cell of one costs a block', () => {
    const cut = boardSizeOn({ width: 40, height: 30 }, flatTop);

    expect(cut.width).toBeLessThan(40);
    expect(cut.height).toBeLessThan(30);
  });

  it('never cuts a board down to nothing', () => {
    expect(boardSizeOn({ width: 1, height: 1 }, flatTop)).toEqual({ width: 4, height: 4 });
  });
});

describe('boardExtentPx()', () => {
  it('makes a board of squares exactly as wide as it has cells', () => {
    expect(boardExtentPx({ width: 26, height: 20 }, squares)).toEqual({ widthPx: 1300, heightPx: 1000 });
  });

  it('makes a flat-topped board narrower across and longer down, its columns overlapping', () => {
    const extent = boardExtentPx({ width: 26, height: 20 }, flatTop);

    expect(extent.widthPx).toBeCloseTo(1140.2668, 3);
    expect(extent.heightPx).toBeCloseTo(1025, 6);
  });

  it('turns it the other way round for a pointy-topped board', () => {
    const extent = boardExtentPx({ width: 26, height: 20 }, pointyTop);

    expect(extent.widthPx).toBeCloseTo(1325, 6);
    expect(extent.heightPx).toBeCloseTo(880.4592, 3);
  });
});

describe('tableSizeFor()', () => {
  it('leaves a board of squares alone', () => {
    expect(tableSizeFor({ width: 26, height: 20 }, squares)).toEqual({ width: 26, height: 20 });
  });

  it('gives a hex board a table of the same count, a table counting hexes as the board does', () => {
    expect(tableSizeFor({ width: 26, height: 20 }, flatTop)).toEqual({ width: 26, height: 20 });
    expect(tableSizeFor({ width: 26, height: 20 }, pointyTop)).toEqual({ width: 26, height: 20 });
  });
});
