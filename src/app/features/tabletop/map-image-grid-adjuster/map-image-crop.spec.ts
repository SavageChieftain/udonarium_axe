import {
  clampOffset,
  computeCoveredCells,
  computeGridCounts,
  effectiveOrigin,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-crop';

describe('computeGridCounts', () => {
  it('counts the cells exactly when they divide evenly', () => {
    expect(computeGridCounts(500, 300, 50, 0, 0)).toEqual({ cols: 10, rows: 6 });
  });

  it('counts only the whole cells when they do not', () => {
    expect(computeGridCounts(520, 333, 50, 0, 0)).toEqual({ cols: 10, rows: 6 });
  });

  it('takes the offset off before dividing', () => {
    expect(computeGridCounts(500, 300, 50, 20, 10)).toEqual({ cols: 9, rows: 5 });
  });

  it('counts none when the offset leaves room for none', () => {
    expect(computeGridCounts(60, 60, 50, 30, 30)).toEqual({ cols: 0, rows: 0 });
  });

  it('counts none for a cell of no size', () => {
    expect(computeGridCounts(500, 300, 0, 0, 0)).toEqual({ cols: 0, rows: 0 });
    expect(computeGridCounts(500, 300, -10, 0, 0)).toEqual({ cols: 0, rows: 0 });
  });

  it('never counts below none, however large the offset', () => {
    expect(computeGridCounts(100, 100, 50, 200, 200)).toEqual({ cols: 0, rows: 0 });
  });

  it('counts them for a fractional cell size', () => {
    expect(computeGridCounts(800, 600, 800 / 16, 0, 0)).toEqual({ cols: 16, rows: 12 });
    expect(computeGridCounts(810, 600, 33.3, 0, 0)).toEqual({ cols: 24, rows: 18 });
  });

  it('does not lose a column to rounding when they do not divide evenly', () => {
    for (const w of [800, 1280, 1000, 1920, 777]) {
      for (let n = 1; n <= 60; n += 1) {
        expect(computeGridCounts(w, w, w / n, 0, 0).cols).toBe(n);
      }
    }
  });

  it('counts a negative offset from the first grid line inside the picture', () => {
    expect(computeGridCounts(800, 600, 50, -10, -10)).toEqual({ cols: 15, rows: 11 });
    expect(computeGridCounts(800, 600, 50, -60, 0)).toEqual({ cols: 15, rows: 12 });
  });
});

describe('effectiveOrigin', () => {
  it('leaves a positive offset alone', () => {
    expect(effectiveOrigin(60, 50)).toBe(60);
    expect(effectiveOrigin(0, 50)).toBe(0);
  });

  it('folds a negative one onto that first line', () => {
    expect(effectiveOrigin(-10, 50)).toBe(40);
    expect(effectiveOrigin(-60, 50)).toBe(40);
    expect(effectiveOrigin(-50, 50)).toBe(0);
  });

  it('returns nothing for a cell of no size', () => {
    expect(effectiveOrigin(-10, 0)).toBe(0);
  });
});

describe('computeCoveredCells', () => {
  it('returns the rows, the columns and the origin of an exact fit', () => {
    const r = computeCoveredCells(0, 0, 1, 480, 240, 48);
    expect(r.cols).toBe(10);
    expect(r.rows).toBe(5);
    expect(r.screenX).toBe(0);
    expect(r.screenY).toBe(0);
    expect(r.imageX).toBe(0);
    expect(r.imageY).toBe(0);
    expect(r.cellImagePx).toBe(48);
  });

  it('keeps the count over half a pixel of overhang', () => {
    const r = computeCoveredCells(0, 0, 1, 480 - 0.5, 240 - 0.5, 48);
    expect(r.cols).toBe(10);
    expect(r.rows).toBe(5);
  });

  it('leaves out a cell the picture only partly covers', () => {
    const r = computeCoveredCells(24, 0, 1, 480, 48, 48);
    expect(r.cols).toBe(9);
    expect(r.rows).toBe(1);
    expect(r.screenX).toBe(48);
  });

  it('counts none when the picture cannot cover even one', () => {
    const r = computeCoveredCells(10, 10, 1, 30, 30, 48);
    expect(r.cols).toBe(0);
    expect(r.rows).toBe(0);
    expect(r.cellImagePx).toBe(48);
  });

  it('keeps the origin inside the picture through that overhang', () => {
    const r = computeCoveredCells(-0.5, -0.5, 1, 480, 240, 48);
    expect(r.imageX).toBeGreaterThanOrEqual(0);
    expect(r.imageY).toBeGreaterThanOrEqual(0);
    expect(r.imageX).toBeLessThanOrEqual(480);
  });

  it('returns nothing for a scale or a cell of no size', () => {
    expect(computeCoveredCells(0, 0, 0, 480, 240, 48).cols).toBe(0);
    expect(computeCoveredCells(0, 0, 1, 480, 240, 0).cols).toBe(0);
  });

  it('converts the cell back into picture pixels when it is scaled up', () => {
    const r = computeCoveredCells(0, 0, 2, 480, 240, 48);
    expect(r.cellImagePx).toBe(24);
  });
});

describe('clampOffset', () => {
  it('leaves an offset within range alone', () => {
    expect(clampOffset(20, 50, 500)).toBe(20);
  });

  it('stops a small negative offset at the floor', () => {
    expect(clampOffset(-100, 50, 500)).toBe(-49);
  });

  it('stops one past the picture at the ceiling', () => {
    expect(clampOffset(999, 50, 500)).toBe(499);
  });

  it('returns nothing for a cell of no size', () => {
    expect(clampOffset(20, 0, 500)).toBe(0);
  });
});
