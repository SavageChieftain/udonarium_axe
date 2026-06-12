import {
  IMAGE_TEXTURE_PREFIX,
  imageTextureIdentifier,
  isImageTextureId,
  isTextureId,
  TEXTURE_BASE_COLOR,
  TEXTURE_IDS,
} from '@axe/features/map-maker/model/textures';
import { describe, expect, it } from 'vitest';

describe('isTextureId', () => {
  it('accepts every built-in id and rejects others', () => {
    for (const id of TEXTURE_IDS) expect(isTextureId(id)).toBe(true);
    expect(isTextureId('image:abc')).toBe(false);
    expect(isTextureId('nope')).toBe(false);
  });

  it('has a base color for every id', () => {
    for (const id of TEXTURE_IDS) {
      expect(TEXTURE_BASE_COLOR[id]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('image texture ids', () => {
  it('exposes the prefix', () => {
    expect(IMAGE_TEXTURE_PREFIX).toBe('image:');
  });

  it('detects image texture ids', () => {
    expect(isImageTextureId('image:foo')).toBe(true);
    expect(isImageTextureId('image:')).toBe(true);
    expect(isImageTextureId('grass')).toBe(false);
    expect(isImageTextureId('')).toBe(false);
    expect(isImageTextureId(undefined as unknown as string)).toBe(false);
  });

  it('extracts the identifier after the prefix', () => {
    expect(imageTextureIdentifier('image:abc123')).toBe('abc123');
    expect(imageTextureIdentifier('image:')).toBe('');
    expect(imageTextureIdentifier('grass')).toBe('');
  });

  it('round-trips prefix and identifier', () => {
    const identifier = 'some-storage-id';
    const id = IMAGE_TEXTURE_PREFIX + identifier;
    expect(isImageTextureId(id)).toBe(true);
    expect(imageTextureIdentifier(id)).toBe(identifier);
  });
});
