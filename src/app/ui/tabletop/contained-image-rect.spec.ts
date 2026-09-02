import { containedImageRect } from '@axe/ui/tabletop/contained-image-rect';
import { describe, expect, it } from 'vitest';

describe('containedImageRect', () => {
  it('centers a portrait image inside a square frame', () => {
    const rect = containedImageRect(64, 64, 200, 300);
    expect(rect?.left).toBeCloseTo(64 / 6);
    expect(rect?.top).toBe(0);
    expect(rect?.width).toBeCloseTo(128 / 3);
    expect(rect?.height).toBe(64);
  });

  it('applies padding before fitting the image', () => {
    const rect = containedImageRect(250, 330, 200, 300, 8);
    expect(rect?.left).toBeCloseTo(250 / 2 - 314 / 3);
    expect(rect?.top).toBe(8);
    expect(rect?.width).toBeCloseTo(628 / 3);
    expect(rect?.height).toBe(314);
  });

  it('returns null for an image or frame without an area', () => {
    expect(containedImageRect(100, 100, 0, 100)).toBeNull();
    expect(containedImageRect(0, 100, 100, 100)).toBeNull();
  });
});
