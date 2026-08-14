import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCircumradius, hexSpacing } from '@axe/domain/tabletop/hex-geometry';
import {
  colsForWidth,
  computeCoveredRegion,
  coversFrame,
  footprintSize,
  rowsForHeight,
  scaleForCols,
  scaleForRows,
  snapAnchor,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-grid-region';

const DC = 48;
const S3 = hexCircumradius(DC);

describe('computeCoveredRegion (square)', () => {
  it('gives squares the same coverage in rectangle form', () => {
    const r = computeCoveredRegion(GridType.SQUARE, 0, 0, 1, 480, 240, DC);
    expect(r.cols).toBe(10);
    expect(r.rows).toBe(5);
    expect(r.screenW).toBe(480);
    expect(r.screenH).toBe(240);
    expect(r.imageX).toBe(0);
    expect(r.imageW).toBe(480);
  });

  it('returns an empty area for no coverage', () => {
    const r = computeCoveredRegion(GridType.SQUARE, 10, 10, 1, 30, 30, DC);
    expect(r.cols).toBe(0);
    expect(r.screenW).toBe(0);
  });
});

describe('computeCoveredRegion (hex flat-top)', () => {
  const { colSpacing, rowSpacing } = hexSpacing(DC, true);

  it('returns the rows and columns asked for from a picture that fits the footprint', () => {
    const cols = 6;
    const rows = 4;
    const w = 2 * S3 + (cols - 1) * colSpacing;
    const h = rows * DC + DC / 2;
    const a = snapAnchor(GridType.HEX_VERTICAL, 100, 100, DC);
    const r = computeCoveredRegion(GridType.HEX_VERTICAL, a.tx, a.ty, 1, w, h, DC);
    expect(r.cols).toBe(cols);
    expect(r.rows).toBe(rows);
    expect(r.screenX).toBeCloseTo(a.tx, 5);
    expect(r.screenY).toBeCloseTo(a.ty, 5);
    expect(r.screenW).toBeCloseTo(w, 5);
    expect(r.screenH).toBeCloseTo(h, 5);
  });

  it('rounds the anchor onto an even column', () => {
    const w = 2 * S3 + 5 * colSpacing;
    const r = computeCoveredRegion(GridType.HEX_VERTICAL, -colSpacing - S3 - 1, 0, 1, w + 2 * colSpacing, 300, DC);
    const i = Math.round((r.screenX + S3) / colSpacing);
    expect(i % 2).toBe(0);
  });

  it('puts the row anchor on the spacing of the rows', () => {
    const r = computeCoveredRegion(GridType.HEX_VERTICAL, 0, 13, 1, 500, 400, DC);
    const j = (r.screenY + DC / 2) / rowSpacing;
    expect(j).toBeCloseTo(Math.round(j), 5);
  });

  it('asks for no stagger from a single column', () => {
    const w = 2 * S3;
    const h = 3 * DC;
    const a = snapAnchor(GridType.HEX_VERTICAL, 100, 100, DC);
    const r = computeCoveredRegion(GridType.HEX_VERTICAL, a.tx, a.ty, 1, w + 0.5, h + 0.5, DC);
    expect(r.cols).toBe(1);
    expect(r.rows).toBe(3);
  });
});

describe('computeCoveredRegion (hex pointy-top)', () => {
  const { rowSpacing } = hexSpacing(DC, false);

  it('returns the rows and columns asked for from a picture that fits the footprint', () => {
    const cols = 5;
    const rows = 6;
    const w = cols * DC + DC / 2;
    const h = 2 * S3 + (rows - 1) * rowSpacing;
    const a = snapAnchor(GridType.HEX_HORIZONTAL, 100, 100, DC);
    const r = computeCoveredRegion(GridType.HEX_HORIZONTAL, a.tx, a.ty, 1, w, h, DC);
    expect(r.cols).toBe(cols);
    expect(r.rows).toBe(rows);
    expect(r.screenW).toBeCloseTo(w, 5);
    expect(r.screenH).toBeCloseTo(h, 5);
  });

  it('rounds the anchor onto an even row', () => {
    const h = 2 * S3 + 5 * rowSpacing;
    const r = computeCoveredRegion(GridType.HEX_HORIZONTAL, 0, -rowSpacing - S3 - 1, 1, 500, h + 2 * rowSpacing, DC);
    const j = Math.round((r.screenY + S3) / rowSpacing);
    expect(j % 2).toBe(0);
  });
});

describe('scaleForCols / scaleForRows', () => {
  it('scales squares by the cells across the picture', () => {
    expect(scaleForCols(GridType.SQUARE, 16, 800, DC)).toBeCloseTo((16 * DC) / 800, 10);
    expect(scaleForRows(GridType.SQUARE, 12, 600, DC)).toBeCloseTo((12 * DC) / 600, 10);
  });

  it('scales a pointy-topped grid by the width of its footprint', () => {
    const { colSpacing } = hexSpacing(DC, true);
    expect(scaleForCols(GridType.HEX_VERTICAL, 6, 800, DC)).toBeCloseTo((2 * S3 + 5 * colSpacing) / 800, 10);
    expect(scaleForRows(GridType.HEX_VERTICAL, 4, 600, DC)).toBeCloseTo((4 * DC + DC / 2) / 600, 10);
  });

  it('scales a flat-topped one by the height of its own', () => {
    const { rowSpacing } = hexSpacing(DC, false);
    expect(scaleForCols(GridType.HEX_HORIZONTAL, 5, 800, DC)).toBeCloseTo((5 * DC + DC / 2) / 800, 10);
    expect(scaleForRows(GridType.HEX_HORIZONTAL, 6, 600, DC)).toBeCloseTo((2 * S3 + 5 * rowSpacing) / 600, 10);
  });

  it('covers what was asked for once that scale is applied', () => {
    for (const type of [GridType.SQUARE, GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
      for (const n of [1, 2, 7, 16]) {
        const s = scaleForCols(type, n, 800, DC);
        const snapped = snapAnchor(type, 0, 0, DC);
        const r = computeCoveredRegion(type, snapped.tx, snapped.ty, s, 800, 4000, DC);
        expect(r.cols).toBe(n);
      }
    }
  });
});

describe('footprintSize / colsForWidth / rowsForHeight', () => {
  it('makes the footprint round trip on every kind of grid', () => {
    for (const type of [GridType.SQUARE, GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
      for (const cols of [2, 7, 16]) {
        for (const rows of [2, 5, 12]) {
          const f = footprintSize(type, cols, rows, DC);
          expect(colsForWidth(type, f.w, DC)).toBe(cols);
          expect(rowsForHeight(type, f.h, DC)).toBe(rows);
        }
      }
    }
  });

  it('agrees with the footprint when the scale is worked back', () => {
    for (const type of [GridType.SQUARE, GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
      const f = footprintSize(type, 6, 4, DC);
      expect(scaleForCols(type, 6, 800, DC)).toBeCloseTo(f.w / 800, 10);
    }
  });

  it('falls back to the smallest value it allows', () => {
    expect(footprintSize(GridType.SQUARE, 0, 5, DC)).toEqual({ w: 0, h: 0 });
    expect(colsForWidth(GridType.SQUARE, -10, DC)).toBe(1);
    expect(rowsForHeight(GridType.HEX_VERTICAL, 0, DC)).toBe(1);
  });
});

describe('coversFrame', () => {
  it('is true when the picture covers the frame', () => {
    expect(coversFrame(0, 0, 480, 240, 48, 48, 96, 96)).toBe(true);
  });

  it('is true when it falls short within tolerance', () => {
    expect(coversFrame(48.5, 48.5, 96, 96, 48, 48, 96.4, 96.4)).toBe(true);
  });

  it('is false when the frame runs off the picture', () => {
    expect(coversFrame(100, 0, 480, 240, 48, 48, 96, 96)).toBe(false);
    expect(coversFrame(0, 0, 100, 240, 48, 48, 96, 96)).toBe(false);
  });
});

describe('snapAnchor', () => {
  it('snaps squares onto whole cells', () => {
    expect(snapAnchor(GridType.SQUARE, 50, -20, DC)).toEqual({ tx: 48, ty: -0 });
  });

  it('snaps a pointy-topped grid onto an even column', () => {
    const { colSpacing } = hexSpacing(DC, true);
    const snapped = snapAnchor(GridType.HEX_VERTICAL, 100, 100, DC);
    const i = (snapped.tx + S3) / colSpacing;
    expect(i).toBeCloseTo(Math.round(i), 8);
    expect(Math.round(i) % 2).toBe(0);
  });

  it('snaps a flat-topped one onto an even row', () => {
    const { rowSpacing } = hexSpacing(DC, false);
    const snapped = snapAnchor(GridType.HEX_HORIZONTAL, 100, 100, DC);
    const j = (snapped.ty + S3) / rowSpacing;
    expect(j).toBeCloseTo(Math.round(j), 8);
    expect(Math.round(j) % 2).toBe(0);
  });
});
