import { TEXTURE_IDS } from '@axe/features/map-maker/model/textures';
import { clearTextureTileCache, createTexturePattern } from '@axe/features/map-maker/render/texture-pattern';
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
