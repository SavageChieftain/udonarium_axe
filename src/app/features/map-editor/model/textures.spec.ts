import {
  IMAGE_TEXTURE_PREFIX,
  imageTextureIdentifier,
  isImageTextureId,
  isTextureId,
  LEGACY_TEXTURE_ALIASES,
  normalizeTextureId,
  TEXTURE_ASSET_URLS,
  TEXTURE_BASE_COLOR,
  TEXTURE_IDS,
} from '@axe/features/map-editor/model/textures';
import { describe, expect, it } from 'vitest';

describe('isTextureId', () => {
  it('accepts every built-in id and rejects others', () => {
    for (const id of TEXTURE_IDS) expect(isTextureId(id)).toBe(true);
    expect(isTextureId('image:abc')).toBe(false);
    expect(isTextureId('nope')).toBe(false);
    expect(isTextureId('grass')).toBe(false);
  });

  it('exposes the 16 asset ids', () => {
    expect(TEXTURE_IDS).toEqual([
      'black_soil',
      'brick',
      'desert',
      'floor',
      'forest',
      'gravel',
      'lava',
      'rock',
      'rock_moss',
      'sand',
      'sea',
      'shallows',
      'steppe',
      'stone_paving_big',
      'stone_paving_small',
      'stone_tile',
    ]);
  });

  it('has a base color for every id', () => {
    for (const id of TEXTURE_IDS) {
      expect(TEXTURE_BASE_COLOR[id]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('maps every id to its webp asset url', () => {
    for (const id of TEXTURE_IDS) {
      expect(TEXTURE_ASSET_URLS[id]).toBe(`assets/images/tiles/${id}.webp`);
    }
  });
});

describe('normalizeTextureId', () => {
  it('maps legacy aliases to the new ids', () => {
    expect(LEGACY_TEXTURE_ALIASES).toEqual({
      grass: 'steppe',
      water: 'sea',
      stone: 'rock',
      wood: 'floor',
      dirt: 'black_soil',
      tile: 'stone_tile',
      snow: 'gravel',
    });
    for (const [legacy, target] of Object.entries(LEGACY_TEXTURE_ALIASES)) {
      expect(normalizeTextureId(legacy)).toBe(target);
    }
  });

  it('passes valid new ids through unchanged', () => {
    for (const id of TEXTURE_IDS) expect(normalizeTextureId(id)).toBe(id);
    expect(normalizeTextureId('sand')).toBe('sand');
    expect(normalizeTextureId('brick')).toBe('brick');
    expect(normalizeTextureId('lava')).toBe('lava');
  });

  it('passes image: ids through unchanged', () => {
    expect(normalizeTextureId('image:abc')).toBe('image:abc');
  });

  it('returns unknown ids unchanged', () => {
    expect(normalizeTextureId('mystery')).toBe('mystery');
  });
});

describe('image texture ids', () => {
  it('exposes the prefix', () => {
    expect(IMAGE_TEXTURE_PREFIX).toBe('image:');
  });

  it('detects image texture ids', () => {
    expect(isImageTextureId('image:foo')).toBe(true);
    expect(isImageTextureId('image:')).toBe(true);
    expect(isImageTextureId('steppe')).toBe(false);
    expect(isImageTextureId('')).toBe(false);
    expect(isImageTextureId(undefined as unknown as string)).toBe(false);
  });

  it('extracts the identifier after the prefix', () => {
    expect(imageTextureIdentifier('image:abc123')).toBe('abc123');
    expect(imageTextureIdentifier('image:')).toBe('');
    expect(imageTextureIdentifier('steppe')).toBe('');
  });

  it('round-trips prefix and identifier', () => {
    const identifier = 'some-storage-id';
    const id = IMAGE_TEXTURE_PREFIX + identifier;
    expect(isImageTextureId(id)).toBe(true);
    expect(imageTextureIdentifier(id)).toBe(identifier);
  });
});
