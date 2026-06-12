import {
  clampOffset,
  computeCoveredCells,
  computeGridCounts,
  effectiveOrigin,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-crop';

describe('computeGridCounts', () => {
  it('割り切れるときはちょうどのマス数を返すこと', () => {
    expect(computeGridCounts(500, 300, 50, 0, 0)).toEqual({ cols: 10, rows: 6 });
  });

  it('余りがあるときは整数マス分だけ切り捨てること', () => {
    expect(computeGridCounts(520, 333, 50, 0, 0)).toEqual({ cols: 10, rows: 6 });
  });

  it('オフセット分を差し引いてから割ること', () => {
    expect(computeGridCounts(500, 300, 50, 20, 10)).toEqual({ cols: 9, rows: 5 });
  });

  it('オフセットが大きく1マスも入らないときは0を返すこと', () => {
    expect(computeGridCounts(60, 60, 50, 30, 30)).toEqual({ cols: 0, rows: 0 });
  });

  it('cellPxが0以下のときは0マスを返すこと', () => {
    expect(computeGridCounts(500, 300, 0, 0, 0)).toEqual({ cols: 0, rows: 0 });
    expect(computeGridCounts(500, 300, -10, 0, 0)).toEqual({ cols: 0, rows: 0 });
  });

  it('オフセットが画像サイズを超えても負のマス数にはしないこと', () => {
    expect(computeGridCounts(100, 100, 50, 200, 200)).toEqual({ cols: 0, rows: 0 });
  });

  it('小数のcellPxでもマス数を正しく算出すること', () => {
    expect(computeGridCounts(800, 600, 800 / 16, 0, 0)).toEqual({ cols: 16, rows: 12 });
    expect(computeGridCounts(810, 600, 33.3, 0, 0)).toEqual({ cols: 24, rows: 18 });
  });

  it('割り切れない列数指定でも浮動小数点誤差で1列欠けないこと', () => {
    for (const w of [800, 1280, 1000, 1920, 777]) {
      for (let n = 1; n <= 60; n += 1) {
        expect(computeGridCounts(w, w, w / n, 0, 0).cols).toBe(n);
      }
    }
  });

  it('負のオフセットは画像内の最初のグリッド線から数えること', () => {
    expect(computeGridCounts(800, 600, 50, -10, -10)).toEqual({ cols: 15, rows: 11 });
    expect(computeGridCounts(800, 600, 50, -60, 0)).toEqual({ cols: 15, rows: 12 });
  });
});

describe('effectiveOrigin', () => {
  it('正のオフセットはそのまま返すこと', () => {
    expect(effectiveOrigin(60, 50)).toBe(60);
    expect(effectiveOrigin(0, 50)).toBe(0);
  });

  it('負のオフセットを画像内の最初のグリッド線へ折り返すこと', () => {
    expect(effectiveOrigin(-10, 50)).toBe(40);
    expect(effectiveOrigin(-60, 50)).toBe(40);
    expect(effectiveOrigin(-50, 50)).toBe(0);
  });

  it('cellPxが0以下のときは0を返すこと', () => {
    expect(effectiveOrigin(-10, 0)).toBe(0);
  });
});

describe('computeCoveredCells', () => {
  it('ぴったり一致するとき行列数とクロップ原点を返すこと', () => {
    const r = computeCoveredCells(0, 0, 1, 480, 240, 48);
    expect(r.cols).toBe(10);
    expect(r.rows).toBe(5);
    expect(r.screenX).toBe(0);
    expect(r.screenY).toBe(0);
    expect(r.imageX).toBe(0);
    expect(r.imageY).toBe(0);
    expect(r.cellImagePx).toBe(48);
  });

  it('許容範囲内の0.5pxのはみ出しはマス数を欠かさないこと', () => {
    const r = computeCoveredCells(0, 0, 1, 480 - 0.5, 240 - 0.5, 48);
    expect(r.cols).toBe(10);
    expect(r.rows).toBe(5);
  });

  it('部分的にしか覆っていないマスは数えないこと', () => {
    const r = computeCoveredCells(24, 0, 1, 480, 48, 48);
    expect(r.cols).toBe(9);
    expect(r.rows).toBe(1);
    expect(r.screenX).toBe(48);
  });

  it('1マスも完全に覆えないほど画像が小さいときは0マスを返すこと', () => {
    const r = computeCoveredCells(10, 10, 1, 30, 30, 48);
    expect(r.cols).toBe(0);
    expect(r.rows).toBe(0);
    expect(r.cellImagePx).toBe(48);
  });

  it('許容範囲のはみ出し時もimageXを画像内にクランプすること', () => {
    const r = computeCoveredCells(-0.5, -0.5, 1, 480, 240, 48);
    expect(r.imageX).toBeGreaterThanOrEqual(0);
    expect(r.imageY).toBeGreaterThanOrEqual(0);
    expect(r.imageX).toBeLessThanOrEqual(480);
  });

  it('scaleやdisplayCellが0以下のときは0を返すこと', () => {
    expect(computeCoveredCells(0, 0, 0, 480, 240, 48).cols).toBe(0);
    expect(computeCoveredCells(0, 0, 1, 480, 240, 0).cols).toBe(0);
  });

  it('拡大時はcellImagePxが画像pxに換算されること', () => {
    const r = computeCoveredCells(0, 0, 2, 480, 240, 48);
    expect(r.cellImagePx).toBe(24);
  });
});

describe('clampOffset', () => {
  it('範囲内のオフセットはそのまま返すこと', () => {
    expect(clampOffset(20, 50, 500)).toBe(20);
  });

  it('セルサイズ分より小さい負オフセットを下限で止めること', () => {
    expect(clampOffset(-100, 50, 500)).toBe(-49);
  });

  it('画像サイズ以上のオフセットを上限で止めること', () => {
    expect(clampOffset(999, 50, 500)).toBe(499);
  });

  it('cellPxが0以下のときは0を返すこと', () => {
    expect(clampOffset(20, 0, 500)).toBe(0);
  });
});
