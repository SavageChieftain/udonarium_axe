import { DungeonRect } from '@axe/domain/tabletop/dungeon/dungeon-layout';

export const ROOM_SHAPES = ['rect', 'circle', 'cross', 'overlap'] as const;

export type RoomShape = (typeof ROOM_SHAPES)[number];

export interface ShapedCell {
  x: number;
  y: number;
}

function rectCells(bounds: DungeonRect): ShapedCell[] {
  const cells: ShapedCell[] = [];
  for (let dy = 0; dy < bounds.h; dy++) {
    for (let dx = 0; dx < bounds.w; dx++) cells.push({ x: bounds.x + dx, y: bounds.y + dy });
  }
  return cells;
}

function circleCells(bounds: DungeonRect): ShapedCell[] {
  const cells: ShapedCell[] = [];
  const cx = (bounds.w - 1) / 2;
  const cy = (bounds.h - 1) / 2;
  const rx = cx + 0.5;
  const ry = cy + 0.5;
  for (let dy = 0; dy < bounds.h; dy++) {
    for (let dx = 0; dx < bounds.w; dx++) {
      const nx = (dx - cx) / rx;
      const ny = (dy - cy) / ry;
      if (nx * nx + ny * ny <= 1) cells.push({ x: bounds.x + dx, y: bounds.y + dy });
    }
  }
  return cells;
}

function crossCells(bounds: DungeonRect): ShapedCell[] {
  const armX = Math.max(1, Math.floor(bounds.w / 3));
  const armY = Math.max(1, Math.floor(bounds.h / 3));
  const cells: ShapedCell[] = [];
  for (let dy = 0; dy < bounds.h; dy++) {
    for (let dx = 0; dx < bounds.w; dx++) {
      const inColumn = dx >= armX && dx < bounds.w - armX;
      const inRow = dy >= armY && dy < bounds.h - armY;
      if (inColumn || inRow) cells.push({ x: bounds.x + dx, y: bounds.y + dy });
    }
  }
  return cells;
}

function overlapCells(bounds: DungeonRect, rng: () => number): ShapedCell[] {
  const taken = new Set<string>();
  const cells: ShapedCell[] = [];
  const add = (rect: DungeonRect) => {
    for (const cell of rectCells(rect)) {
      const key = `${cell.x},${cell.y}`;
      if (taken.has(key)) continue;
      taken.add(key);
      cells.push(cell);
    }
  };

  const splitX = Math.max(1, Math.round(bounds.w * (0.45 + rng() * 0.25)));
  const splitY = Math.max(1, Math.round(bounds.h * (0.45 + rng() * 0.25)));
  add({ x: bounds.x, y: bounds.y, w: bounds.w, h: splitY });
  add({ x: bounds.x + bounds.w - splitX, y: bounds.y, w: splitX, h: bounds.h });
  return cells;
}

/**
 * The cells a room of this shape takes inside its bounds.
 *
 * Rooms that are all one rectangle read as a floor plan drawn with a ruler. Brogue mixes
 * circles and crosses in among them, and the place starts to look built rather than plotted.
 */
export function shapeCells(shape: RoomShape, bounds: DungeonRect, rng: () => number): ShapedCell[] {
  switch (shape) {
    case 'circle':
      return circleCells(bounds);
    case 'cross':
      return crossCells(bounds);
    case 'overlap':
      return overlapCells(bounds, rng);
    default:
      return rectCells(bounds);
  }
}

/** A shape only suits bounds it can actually fill; a cross needs room for its arms. */
export function shapeFits(shape: RoomShape, bounds: DungeonRect): boolean {
  if (shape === 'rect') return true;
  if (shape === 'circle') return bounds.w >= 5 && bounds.h >= 5;
  if (shape === 'cross') return bounds.w >= 7 && bounds.h >= 7;
  return bounds.w >= 5 && bounds.h >= 5;
}
