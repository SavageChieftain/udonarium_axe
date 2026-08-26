import { DungeonMaterial } from '@axe/application/tabletop/dungeon-build.service';
import { DungeonLayout } from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { GridType } from '@axe/domain/tabletop/game-table';
import { MapPaint } from '@axe/domain/tabletop/map-blocks';
import {
  cellKey,
  CellLayer,
  createLayer,
  createScene,
  FillStyle,
  MapScene,
} from '@axe/features/map-editor/model/scene';
import { IMAGE_TEXTURE_PREFIX } from '@axe/features/map-editor/model/textures';

export interface DungeonFloorMaterials {
  floor: DungeonMaterial;
  hazard: DungeonMaterial;
}

function fillFor(material: DungeonMaterial): FillStyle {
  const textureId = material.kind === 'texture' ? material.id : IMAGE_TEXTURE_PREFIX + material.identifier;
  return { type: 'texture', textureId, scale: 1, rotation: 0 };
}

/**
 * The ground of a dungeon as a map the editor could have painted.
 *
 * Everything a floor does, the picture on the table does for nothing: it is walked over,
 * seen past and lit through. Built out of terrain instead it was a third of the pieces on
 * the table and every one of them synced.
 */
export function buildDungeonFloorScene(
  layout: DungeonLayout,
  paint: readonly MapPaint[],
  materials: DungeonFloorMaterials,
  cellPx: number
): MapScene {
  const scene = createScene(layout.width, layout.height, cellPx, GridType.SQUARE);
  scene.gridVisible = false;

  const fills: Record<MapPaint['kind'], FillStyle> = {
    floor: fillFor(materials.floor),
    hazard: fillFor(materials.hazard),
  };

  const layer = createLayer('cell', 'floor') as CellLayer;
  for (const patch of paint) {
    for (let dy = 0; dy < patch.rect.h; dy++) {
      for (let dx = 0; dx < patch.rect.w; dx++) {
        layer.cells[cellKey(patch.rect.x + dx, patch.rect.y + dy)] = patch.texture
          ? fillFor({ kind: 'texture', id: patch.texture })
          : fills[patch.kind];
      }
    }
  }
  scene.layers.push(layer);

  return scene;
}
