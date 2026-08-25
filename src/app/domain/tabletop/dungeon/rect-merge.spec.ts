import { mergeMaskToRects } from '@axe/domain/tabletop/dungeon/rect-merge';

function maskFrom(rows: string[]): { mask: Uint8Array; width: number; height: number } {
  const width = rows[0].length;
  const height = rows.length;
  const mask = new Uint8Array(width * height);
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      mask[y * width + x] = cell === '#' ? 1 : 0;
    });
  });
  return { mask, width, height };
}

function coverage(rects: { x: number; y: number; w: number; h: number }[], width: number, height: number): Uint8Array {
  const covered = new Uint8Array(width * height);
  for (const rect of rects) {
    for (let dy = 0; dy < rect.h; dy++) {
      for (let dx = 0; dx < rect.w; dx++) covered[(rect.y + dy) * width + rect.x + dx] += 1;
    }
  }
  return covered;
}

describe('mergeMaskToRects()', () => {
  it('returns nothing for an empty mask', () => {
    const { mask, width, height } = maskFrom(['....', '....']);

    expect(mergeMaskToRects(mask, width, height, 6)).toEqual([]);
  });

  it('covers a lone cell with a single square', () => {
    const { mask, width, height } = maskFrom(['...', '.#.', '...']);

    expect(mergeMaskToRects(mask, width, height, 6)).toEqual([{ x: 1, y: 1, w: 1, h: 1 }]);
  });

  it('takes a solid block in one rectangle when the span allows', () => {
    const { mask, width, height } = maskFrom(['######', '######', '######', '######', '######', '######']);

    expect(mergeMaskToRects(mask, width, height, 6)).toEqual([{ x: 0, y: 0, w: 6, h: 6 }]);
  });

  it('splits the same block into four when the span is halved', () => {
    const { mask, width, height } = maskFrom(['######', '######', '######', '######', '######', '######']);

    expect(mergeMaskToRects(mask, width, height, 3).length).toBe(4);
  });

  it('covers every set cell exactly once and no clear cell at all', () => {
    const { mask, width, height } = maskFrom([
      '..####....',
      '..####....',
      '###..###..',
      '###..###..',
      '..#####...',
      '..#####...',
      '#.........',
    ]);

    const covered = coverage(mergeMaskToRects(mask, width, height, 4), width, height);

    for (let index = 0; index < mask.length; index++) {
      expect(covered[index]).toBe(mask[index]);
    }
  });

  it('never returns a rectangle longer than the span', () => {
    const { mask, width, height } = maskFrom(['##########', '##########', '##########', '##########', '##########']);

    for (const rect of mergeMaskToRects(mask, width, height, 3)) {
      expect(rect.w).toBeLessThanOrEqual(3);
      expect(rect.h).toBeLessThanOrEqual(3);
    }
  });

  it('cuts a long run down to the span', () => {
    const { mask, width, height } = maskFrom(['############']);

    const rects = mergeMaskToRects(mask, width, height, 5);

    expect(rects.map((rect) => rect.w)).toEqual([5, 5, 2]);
  });

  it('takes a span below one as one', () => {
    const { mask, width, height } = maskFrom(['###']);

    expect(mergeMaskToRects(mask, width, height, 0).map((rect) => rect.w)).toEqual([1, 1, 1]);
  });
});
