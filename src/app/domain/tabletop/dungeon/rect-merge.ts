import { DungeonRect } from '@axe/domain/tabletop/dungeon/dungeon-layout';

/**
 * Cover every set cell of the mask with as few rectangles as possible.
 *
 * A dungeon laid out one terrain per cell costs about fourteen times what the merged one does,
 * both in objects to sync and in edges the sight test has to cross.
 */
export function mergeMaskToRects(mask: Uint8Array, width: number, height: number, maxSpan: number): DungeonRect[] {
  const used = new Uint8Array(mask.length);
  const rects: DungeonRect[] = [];
  const span = Math.max(1, Math.floor(maxSpan));

  const free = (x: number, y: number): boolean => mask[y * width + x] === 1 && used[y * width + x] === 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!free(x, y)) continue;

      let w = 0;
      while (x + w < width && w < span && free(x + w, y)) w++;

      let h = 1;
      while (y + h < height && h < span) {
        let wholeRow = true;
        for (let dx = 0; dx < w; dx++) {
          if (!free(x + dx, y + h)) {
            wholeRow = false;
            break;
          }
        }
        if (!wholeRow) break;
        h++;
      }

      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) used[(y + dy) * width + x + dx] = 1;
      }
      rects.push({ x, y, w, h });
    }
  }

  return rects;
}
