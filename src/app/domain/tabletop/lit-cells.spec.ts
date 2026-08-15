import { GridType } from '@axe/domain/tabletop/game-table';
import { computeLitCells, isPointInLitShape, isPointInPolygon } from '@axe/domain/tabletop/lit-cells';
import { describe, expect, it } from 'vitest';

const BOUNDS = { widthPx: 500, heightPx: 500 };

function circle(x: number, y: number, dimPx: number) {
  return { x, y, dimPx, angle: 360, direction: 0 };
}

describe('isPointInLitShape', () => {
  it('lights only what falls inside the radius', () => {
    const shape = circle(100, 100, 50);
    expect(isPointInLitShape(shape, 100, 100)).toBe(true);
    expect(isPointInLitShape(shape, 140, 100)).toBe(true);
    expect(isPointInLitShape(shape, 160, 100)).toBe(false);
  });

  it('cuts a wedge by its direction and its spread', () => {
    const cone = { x: 0, y: 0, dimPx: 100, angle: 90, direction: 0 };
    expect(isPointInLitShape(cone, 50, 0)).toBe(true);
    expect(isPointInLitShape(cone, 50, 40)).toBe(true);
    expect(isPointInLitShape(cone, 0, 50)).toBe(false);
    expect(isPointInLitShape(cone, -50, 0)).toBe(false);
  });

  it('works across the half turn', () => {
    const cone = { x: 0, y: 0, dimPx: 100, angle: 90, direction: 180 };
    expect(isPointInLitShape(cone, -50, 0)).toBe(true);
    expect(isPointInLitShape(cone, 50, 0)).toBe(false);
  });

  it('lights nothing beyond an obstacle', () => {
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
  it('tells the inside from the outside', () => {
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
  it('returns no cells without a light', () => {
    expect(computeLitCells([], 50, GridType.SQUARE, BOUNDS)).toEqual([]);
  });

  it('returns the squares whose centres the light reaches', () => {
    const cells = computeLitCells([circle(25, 25, 30)], 50, GridType.SQUARE, BOUNDS);

    expect(cells).toHaveLength(1);
    expect(cells[0]).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ]);
  });

  it('leaves out those it does not', () => {
    const cells = computeLitCells([circle(25, 25, 60)], 50, GridType.SQUARE, BOUNDS);
    expect(cells).toHaveLength(3);
  });

  it('returns a cell once however many lights reach it', () => {
    const cells = computeLitCells([circle(25, 25, 30), circle(30, 30, 30)], 50, GridType.SQUARE, BOUNDS);
    expect(cells).toHaveLength(1);
  });

  it('never runs off the table', () => {
    const cells = computeLitCells([circle(0, 0, 200)], 50, GridType.SQUARE, { widthPx: 100, heightPx: 100 });
    expect(cells).toHaveLength(4);
  });

  it('returns the corners of a hex on a hex grid', () => {
    const cells = computeLitCells([circle(0, 0, 10)], 50, GridType.HEX_VERTICAL, BOUNDS);

    expect(cells).toHaveLength(1);
    expect(cells[0]).toHaveLength(6);
  });

  it('returns nothing for a cell of no size', () => {
    expect(computeLitCells([circle(25, 25, 30)], 0, GridType.SQUARE, BOUNDS)).toEqual([]);
  });
});
