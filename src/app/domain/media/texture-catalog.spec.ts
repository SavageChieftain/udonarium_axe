import { existsSync } from 'node:fs';

import {
  DUNGEON_PROP_ASSET_URLS,
  DUNGEON_PROP_BASE_COLOR,
  DUNGEON_PROP_IDS,
  isTextureId,
  isWallTextureId,
  TEXTURE_ASSET_URLS,
  TEXTURE_BASE_COLOR,
  TEXTURE_IDS,
  TEXTURE_IMAGE_TAG,
  WALL_TEXTURE_ASSET_URLS,
  WALL_TEXTURE_BASE_COLOR,
  WALL_TEXTURE_IDS,
  WALL_TOP_TEXTURE,
} from '@axe/domain/media/texture-catalog';
import { describe, expect, it } from 'vitest';

const ALL_URLS = [
  ...Object.values(TEXTURE_ASSET_URLS),
  ...Object.values(WALL_TEXTURE_ASSET_URLS),
  ...Object.values(DUNGEON_PROP_ASSET_URLS),
];

describe('isTextureId', () => {
  it('accepts every built-in id and rejects others', () => {
    for (const id of TEXTURE_IDS) expect(isTextureId(id)).toBe(true);
    expect(isTextureId('image:abc')).toBe(false);
    expect(isTextureId('nope')).toBe(false);
    expect(isTextureId('grass')).toBe(false);
  });
});

describe('the texture catalog', () => {
  it('keeps the original sixteen at the head of the list', () => {
    expect(TEXTURE_IDS.slice(0, 16)).toEqual([
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

  it('leaves the leading dot off every url', () => {
    // ImageStorage keys a bundled picture by its url, so './x' and 'x' would become two entries for one file.
    for (const url of ALL_URLS) {
      expect(url.startsWith('.')).toBe(false);
    }
  });

  it('points every url at a file that is really there', () => {
    for (const url of ALL_URLS) {
      expect(existsSync(`src/${url}`)).toBe(true);
    }
  });

  it('names the tag that marks a picture as a pattern', () => {
    expect(TEXTURE_IMAGE_TAG).toBe('テクスチャ');
  });
});

describe('the wall catalog', () => {
  it('has a url, a colour and a top for every wall', () => {
    for (const id of WALL_TEXTURE_IDS) {
      expect(WALL_TEXTURE_ASSET_URLS[id]).toBe(`assets/images/walls/${id}.webp`);
      expect(WALL_TEXTURE_BASE_COLOR[id]).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(TEXTURE_IDS).toContain(WALL_TOP_TEXTURE[id]);
    }
  });

  it('tells a wall from a floor', () => {
    for (const id of WALL_TEXTURE_IDS) expect(isWallTextureId(id)).toBe(true);
    for (const id of TEXTURE_IDS) expect(isWallTextureId(id)).toBe(false);
    expect(isWallTextureId('nope')).toBe(false);
  });
});

describe('the dungeon props', () => {
  it('has a url and a colour for every door and stair', () => {
    for (const id of DUNGEON_PROP_IDS) {
      expect(DUNGEON_PROP_ASSET_URLS[id]).toBe(`assets/images/dungeon/${id}.webp`);
      expect(DUNGEON_PROP_BASE_COLOR[id]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
