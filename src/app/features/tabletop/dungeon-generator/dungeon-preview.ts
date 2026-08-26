import {
  DUNGEON_PROP_BASE_COLOR,
  TEXTURE_BASE_COLOR,
  TextureId,
  WALL_TEXTURE_BASE_COLOR,
  WallTextureId,
} from '@axe/domain/media/texture-catalog';
import { DungeonBlock } from '@axe/domain/tabletop/dungeon/dungeon-blocks';
import { DungeonLayout } from '@axe/domain/tabletop/dungeon/dungeon-layout';

export interface PreviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

export interface DungeonPreview {
  viewBox: string;
  rects: PreviewRect[];
}

export interface PreviewColors {
  wall: string;
  floor: string;
  hazard: string;
}

export const TORCH_FILL = '#ffce6a';
const DOOR_FILL = DUNGEON_PROP_BASE_COLOR.door_wood;
const STAIR_FILL = DUNGEON_PROP_BASE_COLOR.stair_up;
const UNKNOWN_WALL = '#6b6b6b';
const UNKNOWN_FLOOR = '#3a3a3a';

export function previewColors(wall: string, floor: string, hazard: string): PreviewColors {
  return {
    wall: WALL_TEXTURE_BASE_COLOR[wall as WallTextureId] ?? UNKNOWN_WALL,
    floor: TEXTURE_BASE_COLOR[floor as TextureId] ?? UNKNOWN_FLOOR,
    hazard: TEXTURE_BASE_COLOR[hazard as TextureId] ?? UNKNOWN_FLOOR,
  };
}

function fillFor(block: DungeonBlock, colors: PreviewColors): string {
  switch (block.kind) {
    case 'torch':
      return TORCH_FILL;
    case 'wall':
      return colors.wall;
    case 'hazard':
      return colors.hazard;
    case 'door':
      return DOOR_FILL;
    case 'stairUp':
    case 'stairDown':
      return STAIR_FILL;
    default:
      return colors.floor;
  }
}

/**
 * Draw the blocks that would be built, not the cells they came from.
 *
 * Rolling again here costs nothing, while rolling again after the fact means a thousand
 * objects made and unmade. Showing the merged blocks also makes the count honest.
 */
export function buildDungeonPreview(
  layout: DungeonLayout,
  blocks: readonly DungeonBlock[],
  colors: PreviewColors
): DungeonPreview {
  return {
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    rects: blocks.map((block) => ({ ...block.rect, fill: fillFor(block, colors) })),
  };
}
