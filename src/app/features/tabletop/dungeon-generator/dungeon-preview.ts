import {
  DUNGEON_PROP_BASE_COLOR,
  TEXTURE_BASE_COLOR,
  TextureId,
  WALL_TEXTURE_BASE_COLOR,
  WallTextureId,
} from '@axe/domain/media/texture-catalog';
import { DungeonBlock } from '@axe/domain/tabletop/dungeon/dungeon-blocks';
import { DungeonLayout, DungeonPoint } from '@axe/domain/tabletop/dungeon/dungeon-layout';

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

/** Pull a colour towards black, which is what tells the rock from the floor at this size. */
function darken(hex: string, keep: number): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return hex;
  const channel = (at: number) =>
    Math.round(parseInt(value.slice(at, at + 2), 16) * keep)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

/**
 * A wall and the floor beside it are often near enough the same colour to read as one field,
 * and a plan nobody can read is not worth drawing. The rock is sunk well below the floor.
 */
export function previewColors(wall: string, floor: string, hazard: string): PreviewColors {
  return {
    wall: darken(WALL_TEXTURE_BASE_COLOR[wall as WallTextureId] ?? UNKNOWN_WALL, 0.34),
    floor: TEXTURE_BASE_COLOR[floor as TextureId] ?? UNKNOWN_FLOOR,
    hazard: TEXTURE_BASE_COLOR[hazard as TextureId] ?? UNKNOWN_FLOOR,
  };
}

function fillFor(block: DungeonBlock, colors: PreviewColors): string {
  switch (block.kind) {
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
  colors: PreviewColors,
  lights: readonly DungeonPoint[] = []
): DungeonPreview {
  return {
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    rects: [
      ...blocks.map((block) => ({ ...block.rect, fill: fillFor(block, colors) })),
      ...lights.map((light) => ({ x: light.x, y: light.y, w: 1, h: 1, fill: TORCH_FILL })),
    ],
  };
}
