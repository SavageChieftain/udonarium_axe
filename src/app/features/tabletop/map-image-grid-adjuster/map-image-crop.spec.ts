import { clampOffset, computeGridCounts } from '@axe/features/tabletop/map-image-grid-adjuster/map-image-crop';

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
