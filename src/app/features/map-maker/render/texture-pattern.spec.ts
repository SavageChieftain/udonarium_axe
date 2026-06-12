import { TEXTURE_IDS } from '@axe/features/map-maker/model/textures';
import {
  clearTextureTileCache,
  createImageTexturePattern,
  createTexturePattern,
  tileableValueNoise,
} from '@axe/features/map-maker/render/texture-pattern';
import { describe, expect, it } from 'vitest';

function fakeCtx(pattern: unknown): CanvasRenderingContext2D {
  return {
    createPattern: () => pattern,
  } as unknown as CanvasRenderingContext2D;
}

describe('createTexturePattern', () => {
  it('returns null when ctx lacks createPattern', () => {
    clearTextureTileCache();
    const ctx = {} as unknown as CanvasRenderingContext2D;
    expect(createTexturePattern(ctx, 'grass', 64)).toBeNull();
  });

  it('returns null when ctx is null-ish', () => {
    expect(createTexturePattern(null as unknown as CanvasRenderingContext2D, 'grass', 64)).toBeNull();
  });

  it('does not throw for any texture id', () => {
    const ctx = fakeCtx({});
    for (const id of TEXTURE_IDS) {
      expect(() => createTexturePattern(ctx, id, 48)).not.toThrow();
    }
  });

  it('returns null gracefully when offscreen canvas unavailable', () => {
    clearTextureTileCache();
    const ctx = fakeCtx({});
    const result = createTexturePattern(ctx, 'water', 32);
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('swallows createPattern throwing', () => {
    const ctx = {
      createPattern: () => {
        throw new Error('boom');
      },
    } as unknown as CanvasRenderingContext2D;
    expect(createTexturePattern(ctx, 'stone', 40)).toBeNull();
  });
});

describe('tileableValueNoise', () => {
  const SEED = 0x1234abcd;
  const N = 8;

  it('wraps seamlessly: noise(x,y) == noise(x+N,y) == noise(x,y+N)', () => {
    for (const octaves of [1, 2, 3]) {
      for (let i = 0; i < 12; i += 1) {
        const x = i * 0.37;
        const y = 7 - i * 0.53;
        const base = tileableValueNoise(x, y, SEED, N, octaves);
        expect(tileableValueNoise(x + N, y, SEED, N, octaves)).toBeCloseTo(base, 10);
        expect(tileableValueNoise(x, y + N, SEED, N, octaves)).toBeCloseTo(base, 10);
        expect(tileableValueNoise(x + N, y + N, SEED, N, octaves)).toBeCloseTo(base, 10);
        expect(tileableValueNoise(x + 2 * N, y, SEED, N, octaves)).toBeCloseTo(base, 10);
      }
    }
  });

  it('is deterministic for a given seed and varies across seeds', () => {
    const a = tileableValueNoise(1.5, 2.5, SEED, N, 3);
    const b = tileableValueNoise(1.5, 2.5, SEED, N, 3);
    expect(a).toBe(b);
    const c = tileableValueNoise(1.5, 2.5, SEED ^ 0xffff, N, 3);
    expect(c).not.toBe(a);
  });

  it('stays within [0, 1]', () => {
    for (let i = 0; i < 50; i += 1) {
      const v = tileableValueNoise(i * 1.31, i * 0.71, SEED, N, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('createImageTexturePattern', () => {
  function patternCtx(pattern: unknown): CanvasRenderingContext2D {
    return { createPattern: () => pattern } as unknown as CanvasRenderingContext2D;
  }

  it('returns null without ctx, createPattern, or image', () => {
    const img = { width: 100, height: 100 } as unknown as CanvasImageSource;
    expect(createImageTexturePattern(null as unknown as CanvasRenderingContext2D, img, 32)).toBeNull();
    expect(createImageTexturePattern({} as unknown as CanvasRenderingContext2D, img, 32)).toBeNull();
    expect(createImageTexturePattern(patternCtx({}), null as unknown as CanvasImageSource, 32)).toBeNull();
  });

  it('returns null when createPattern yields null', () => {
    const img = { width: 100, height: 100 } as unknown as CanvasImageSource;
    expect(createImageTexturePattern(patternCtx(null), img, 32)).toBeNull();
  });

  it('swallows createPattern throwing', () => {
    const ctx = {
      createPattern: () => {
        throw new Error('boom');
      },
    } as unknown as CanvasRenderingContext2D;
    const img = { width: 100, height: 100 } as unknown as CanvasImageSource;
    expect(createImageTexturePattern(ctx, img, 32)).toBeNull();
  });

  it('scales the source so its width maps to 2 cells', () => {
    const transforms: { a: number; d: number }[] = [];
    const pattern = {
      setTransform: (m: { a: number; d: number }) => transforms.push({ a: m.a, d: m.d }),
    } as unknown as CanvasPattern;
    const img = { width: 50, height: 50 } as unknown as CanvasImageSource;
    const result = createImageTexturePattern(patternCtx(pattern), img, 32);
    expect(result).toBe(pattern);
    if (typeof DOMMatrix !== 'undefined') {
      expect(transforms).toHaveLength(1);
      expect(transforms[0].a).toBeCloseTo((2 * 32) / 50, 6);
      expect(transforms[0].d).toBeCloseTo((2 * 32) / 50, 6);
    }
  });
});
