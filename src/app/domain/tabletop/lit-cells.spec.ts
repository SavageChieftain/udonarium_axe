import { GridType } from '@axe/domain/tabletop/game-table';
import { computeLitCells, isPointInLitShape, isPointInPolygon } from '@axe/domain/tabletop/lit-cells';
import { describe, expect, it } from 'vitest';

const BOUNDS = { widthPx: 500, heightPx: 500 };

function circle(x: number, y: number, dimPx: number) {
  return { x, y, dimPx, angle: 360, direction: 0 };
}

describe('isPointInLitShape', () => {
  it('半径の内側だけを照らす', () => {
    const shape = circle(100, 100, 50);
    expect(isPointInLitShape(shape, 100, 100)).toBe(true);
    expect(isPointInLitShape(shape, 140, 100)).toBe(true);
    expect(isPointInLitShape(shape, 160, 100)).toBe(false);
  });

  it('扇形は向きと開き角で切る', () => {
    const cone = { x: 0, y: 0, dimPx: 100, angle: 90, direction: 0 };
    expect(isPointInLitShape(cone, 50, 0)).toBe(true);
    expect(isPointInLitShape(cone, 50, 40)).toBe(true);
    expect(isPointInLitShape(cone, 0, 50)).toBe(false);
    expect(isPointInLitShape(cone, -50, 0)).toBe(false);
  });

  it('向きが 180 度をまたいでも判定できる', () => {
    const cone = { x: 0, y: 0, dimPx: 100, angle: 90, direction: 180 };
    expect(isPointInLitShape(cone, -50, 0)).toBe(true);
    expect(isPointInLitShape(cone, 50, 0)).toBe(false);
  });

  it('遮蔽ポリゴンの外は照らさない', () => {
    const shape = {
      ...circle(0, 0, 100),
      clipPolygon: [
        { x: -10, y: -10 },
        { x: 40, y: -10 },
        { x: 40, y: 40 },
        { x: -10, y: 40 },
      ],
    };
    expect(isPointInLitShape(shape, 20, 20)).toBe(true);
    expect(isPointInLitShape(shape, 80, 20)).toBe(false);
  });
});

describe('isPointInPolygon', () => {
  it('内側と外側を判定する', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(isPointInPolygon(square, 5, 5)).toBe(true);
    expect(isPointInPolygon(square, 15, 5)).toBe(false);
  });
});

describe('computeLitCells', () => {
  it('照明が無ければセルを返さない', () => {
    expect(computeLitCells([], 50, GridType.SQUARE, BOUNDS)).toEqual([]);
  });

  it('スクウェアではセル中心が光の内側のマスだけを返す', () => {
    const cells = computeLitCells([circle(25, 25, 30)], 50, GridType.SQUARE, BOUNDS);

    expect(cells).toHaveLength(1);
    expect(cells[0]).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ]);
  });

  it('中心が届かないマスは含めない', () => {
    const cells = computeLitCells([circle(25, 25, 60)], 50, GridType.SQUARE, BOUNDS);
    expect(cells).toHaveLength(3);
  });

  it('重なった照明でもマスは重複しない', () => {
    const cells = computeLitCells([circle(25, 25, 30), circle(30, 30, 30)], 50, GridType.SQUARE, BOUNDS);
    expect(cells).toHaveLength(1);
  });

  it('テーブルの外へはみ出さない', () => {
    const cells = computeLitCells([circle(0, 0, 200)], 50, GridType.SQUARE, { widthPx: 100, heightPx: 100 });
    expect(cells).toHaveLength(4);
  });

  it('ヘクスでは六角形の頂点を返す', () => {
    const cells = computeLitCells([circle(0, 0, 10)], 50, GridType.HEX_VERTICAL, BOUNDS);

    expect(cells).toHaveLength(1);
    expect(cells[0]).toHaveLength(6);
  });

  it('グリッドサイズが 0 なら何も返さない', () => {
    expect(computeLitCells([circle(25, 25, 30)], 0, GridType.SQUARE, BOUNDS)).toEqual([]);
  });
});
