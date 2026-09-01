import { SegmentIndex, SegmentIndexes } from '@axe/domain/tabletop/los/segment-index';
import { rectangleSegments, segmentClearBetween, TallSegment } from '@axe/domain/tabletop/los/segments';
import { describe, expect, it } from 'vitest';

function boxes(): TallSegment[] {
  const segments: TallSegment[] = [];
  for (let x = 0; x < 1000; x += 250) {
    for (let y = 0; y < 1000; y += 250) {
      for (const edge of rectangleSegments(x + 40, y + 40, 120, 120, 0)) {
        segments.push({ ...edge, heightPx: 100 + ((x + y) % 200) });
      }
    }
  }
  return segments;
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe('SegmentIndex', () => {
  it('answers exactly as walking every segment does', () => {
    const segments = boxes();
    const index = new SegmentIndex(segments, 100);
    const random = seeded(7);
    for (let i = 0; i < 400; i++) {
      const ax = random() * 1200 - 100;
      const ay = random() * 1200 - 100;
      const bx = random() * 1200 - 100;
      const by = random() * 1200 - 100;
      const az = random() * 200;
      expect(index.clearBetween(ax, ay, az, bx, by, 0)).toBe(segmentClearBetween(ax, ay, az, bx, by, 0, segments));
    }
  });

  it('lets everything through when there is nothing in the way', () => {
    expect(new SegmentIndex([], 100).clearBetween(0, 0, 0, 500, 500, 0)).toBe(true);
  });

  it('leaves out what an eye is already above', () => {
    const wall: TallSegment[] = [{ x1: 100, y1: -100, x2: 100, y2: 100, heightPx: 50 }];
    const indexes = new SegmentIndexes(wall, 100);
    expect(indexes.above(0).clearBetween(0, 0, 0, 200, 0, 0)).toBe(false);
    expect(indexes.above(80).clearBetween(0, 0, 80, 200, 0, 80)).toBe(true);
  });

  it('hands the same index back for the same height', () => {
    const indexes = new SegmentIndexes([{ x1: 0, y1: 0, x2: 10, y2: 10 }], 50);
    expect(indexes.above(12)).toBe(indexes.above(12));
  });
});
