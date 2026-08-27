import { inject, Injectable } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { AmbienceKind } from '@axe/domain/effect/ambience/ambience-kind';
import { ImageTag } from '@axe/domain/media/image-tag';
import { LIGHT_SKIN_ASSET_URLS, LightSkinId } from '@axe/domain/media/light-skins';
import {
  DUNGEON_PROP_ASSET_URLS,
  TEXTURE_ASSET_URLS,
  WALL_TEXTURE_ASSET_URLS,
  WALL_TOP_TEXTURE,
  WallTextureId,
} from '@axe/domain/media/texture-catalog';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { LightSource } from '@axe/domain/tabletop/light-source';
import {
  MapAmbience,
  MapBlock,
  MapBlocks,
  MapLight,
  MapLightKind,
  MapMaterial,
  MapMood,
  MapSize,
} from '@axe/domain/tabletop/map-blocks';
import { blockOrigin, MapGrid, tableSizeFor } from '@axe/domain/tabletop/map-grid';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';
import { DoorStyle, SlopeDirection, Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';
import { applyLightPreset, LightPreset } from '@axe/domain/tabletop/vision-types';

const TERRAIN_IMAGE_TAG = '地形';
/** A generated dungeon is drawn on fifty pixel squares, painted ground and terrain alike. */
export const DUNGEON_GRID_SIZE = 50;
const GRID_SIZE = DUNGEON_GRID_SIZE;
/** How thick a stair reads on the ground it is drawn on. */
const STAIR_HEIGHT = 0.05;
/** How deep a door slab is, so it reads as a door in the passage rather than a block filling it. */
const DOOR_THICKNESS = 0.25;

const LIGHT_PRESET: Record<MapLightKind, LightPreset> = {
  sconce: LightPreset.SCONCE,
  campfire: LightPreset.CAMPFIRE,
  brazier: LightPreset.BRAZIER,
  stand: LightPreset.LANTERN,
  lantern: LightPreset.LANTERN,
};

/** A stand and a lantern burn alike but do not look alike, so the picture follows the kind. */
const LIGHT_SKIN: Record<MapLightKind, LightSkinId> = {
  sconce: 'light_sconce',
  campfire: 'light_campfire',
  brazier: 'light_brazier',
  stand: 'light_stand',
  lantern: 'light_lantern',
};
const WALL_MOUNTED: readonly MapLightKind[] = ['sconce', 'lantern'];

/** How many terrains go in before the thread is handed back, so the panel can move its bar. */
const CHUNK_SIZE = 32;

export type DungeonMaterial = MapMaterial;

export interface DungeonBuildOptions {
  name: string;
  wall: DungeonMaterial;
  /** How tall the walls stand, in cells. The atmosphere suggests one; the panel may override it. */
  wallHeight: number;
  /** The painted ground, already in the image storage. The table wears it as its surface. */
  floorImage: string;
  /** What the master needs to run the place. The caller writes it; the table never carries it. */
  summary: string;
  /** What shape the cells are. Left out, squares. */
  gridType?: GridType;
}

export interface DungeonBuildResult {
  table: GameTable;
  terrainCount: number;
  /**
   * What the master needs to run the place, as text for the panel to show.
   *
   * It is not put on the table: a shared memo is not a child of its table, so notes left
   * on one dungeon would follow the master onto every other table in the room.
   */
  summary: string;
}

@Injectable({ providedIn: 'root' })
export class DungeonBuildService {
  private readonly imageStorage = inject(ImageStorage);
  private readonly t = inject(TRANSLATE_FN);

  /** Register a bundled picture once and hand back the identifier a terrain stores. */
  registerAsset(url: string): string {
    const existing = this.imageStorage.get(url);
    if (existing) return existing.identifier;
    const image = this.imageStorage.add(url);
    ImageTag.create(image.identifier).tag = TERRAIN_IMAGE_TAG;
    return image.identifier;
  }

  resolveMaterial(material: DungeonMaterial, urls: Record<string, string>): string {
    if (material.kind === 'library') return material.identifier;
    const url = urls[material.id];
    return url ? this.registerAsset(url) : '';
  }

  async build(
    size: MapSize,
    mood: MapMood,
    blocks: MapBlocks,
    options: DungeonBuildOptions,
    onProgress?: (done: number, total: number) => void
  ): Promise<DungeonBuildResult> {
    const wallSide = this.resolveMaterial(options.wall, WALL_TEXTURE_ASSET_URLS);
    const wallTop =
      options.wall.kind === 'texture'
        ? this.registerAsset(TEXTURE_ASSET_URLS[WALL_TOP_TEXTURE[options.wall.id as WallTextureId]] ?? '')
        : wallSide;

    const grid: MapGrid = { type: options.gridType ?? GridType.SQUARE, sizePx: GRID_SIZE };
    const table = this.createTable(size, mood, options, grid);

    let done = 0;
    for (const block of blocks.blocks) {
      table.appendChild(this.createTerrain(block, { wallSide, wallTop }, options.wallHeight, grid));
      done++;
      if (done % CHUNK_SIZE === 0) {
        onProgress?.(done, blocks.blocks.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    onProgress?.(blocks.blocks.length, blocks.blocks.length);

    this.layAmbiences(table, blocks.ambiences, grid);
    this.standLights(table, blocks.lights, options.wallHeight, grid);

    return { table, terrainCount: blocks.blocks.length, summary: options.summary };
  }

  private createTable(size: MapSize, mood: MapMood, options: DungeonBuildOptions, grid: MapGrid): GameTable {
    const table = new GameTable();
    const room = tableSizeFor(size, grid);
    table.name = options.name;
    table.width = room.width;
    table.height = room.height;
    table.gridSize = GRID_SIZE;
    table.gridType = options.gridType ?? GridType.SQUARE;
    table.gridShow = mood.gridShow;
    table.imageIdentifier = options.floorImage;
    table.backgroundImageIdentifier = '';
    table.darknessEnabled = mood.darkness > 0;
    if (mood.darkness > 0) table.darknessLevel = mood.darkness;
    table.ambientColor = mood.ambientColor;
    table.weatherKind = mood.weatherKind;
    table.weatherDensity = mood.weatherDensity;
    table.initialize();
    return table;
  }

  private createTerrain(
    block: MapBlock,
    images: { wallSide: string; wallTop: string },
    wallHeight: number,
    grid: MapGrid
  ): Terrain {
    const { rect } = block;
    const name = this.terrainName(block);
    const terrain = this.terrainFor(block, images, name, wallHeight);

    terrain.isTiledTexture = true;
    terrain.isLocked = true;
    terrain.blocksSight = block.blocksSight;
    terrain.blocksLight = block.blocksSight;

    // A door slab is thinner than its cell, so it is set in the middle of the way it bars.
    const inset = ((1 - DOOR_THICKNESS) / 2) * GRID_SIZE;
    let offsetX = block.kind === 'door' && block.across === 'x' ? inset : 0;
    let offsetY = block.kind === 'door' && block.across === 'y' ? inset : 0;
    // A piece narrower than the ground it stands on is put in the middle of it, not the corner.
    if (block.footprint) {
      offsetX = ((rect.w - block.footprint.w) / 2) * GRID_SIZE;
      offsetY = ((rect.h - block.footprint.d) / 2) * GRID_SIZE;
    }
    if (block.offset) {
      offsetX += block.offset.x * GRID_SIZE;
      offsetY += block.offset.y * GRID_SIZE;
    }

    // Writing the whole location goes through setAttribute, which syncs; touching location.x does not.
    const at = blockOrigin(rect, grid);
    terrain.location = { name: 'table', x: at.x + offsetX, y: at.y + offsetY };
    terrain.posZ = 0;
    return terrain;
  }

  private terrainFor(
    block: MapBlock,
    images: { wallSide: string; wallTop: string },
    name: string,
    wallHeight: number
  ): Terrain {
    const { rect } = block;
    switch (block.kind) {
      case 'wall': {
        const terrain = Terrain.create(name, rect.w, rect.h, wallHeight, images.wallSide, images.wallTop);
        terrain.mode = TerrainViewState.ALL;
        return terrain;
      }
      case 'door': {
        const door = this.registerAsset(DUNGEON_PROP_ASSET_URLS[block.prop ?? 'door_wood']);
        const acrossX = block.across === 'x';
        const width = acrossX ? DOOR_THICKNESS : rect.w;
        const depth = acrossX ? rect.h : DOOR_THICKNESS;
        const terrain = Terrain.create(name, width, depth, wallHeight, door, door);
        terrain.mode = TerrainViewState.ALL;
        terrain.doorStyle = block.doorStyle ?? DoorStyle.SWING;
        if (block.doorMirrored) terrain.doorMirrored = true;
        return terrain;
      }
      case 'prop': {
        // A prop is not made of the walls of a place, so its pictures come from either shelf:
        // a canopy wears the same leaves on its flanks as it does on its crown.
        const shelves = { ...WALL_TEXTURE_ASSET_URLS, ...TEXTURE_ASSET_URLS };
        const side = block.skin ? this.resolveMaterial(block.skin.side, shelves) : images.wallSide;
        const top = block.skin ? this.resolveMaterial(block.skin.top, shelves) : images.wallTop;
        const width = block.footprint?.w ?? rect.w;
        const depth = block.footprint?.d ?? rect.h;
        const terrain = Terrain.create(name, width, depth, block.height ?? 1, side, top);
        terrain.mode = TerrainViewState.ALL;
        if (block.altitude) terrain.altitude = block.altitude;
        if (block.rotate) terrain.rotate = block.rotate;
        return terrain;
      }
      default: {
        const image = this.registerAsset(DUNGEON_PROP_ASSET_URLS[block.prop ?? 'stair_up']);
        const terrain = Terrain.create(name, rect.w, rect.h, STAIR_HEIGHT, image, image);
        terrain.mode = TerrainViewState.FLOOR;
        terrain.isSlope = true;
        terrain.slopeDirection = block.kind === 'stairUp' ? SlopeDirection.TOP : SlopeDirection.BOTTOM;
        terrain.isDropShadow = false;
        return terrain;
      }
    }
  }

  private terrainName(block: MapBlock): string {
    if (block.name) return block.name;
    switch (block.kind) {
      case 'wall':
        return this.t('feature.tabletop.dungeonGenerator.piece.wall');
      case 'door':
        return block.locked
          ? this.t('feature.tabletop.dungeonGenerator.piece.doorLocked')
          : this.t('feature.tabletop.dungeonGenerator.piece.door');
      case 'stairUp':
        return this.t('feature.tabletop.dungeonGenerator.piece.entrance');
      default:
        return this.t('feature.tabletop.dungeonGenerator.piece.exit');
    }
  }

  /** What hangs in the air over a patch of ground, as a child of the table it hangs over. */
  private layAmbiences(table: GameTable, ambiences: readonly MapAmbience[], grid: MapGrid): void {
    for (const patch of ambiences) {
      const ambience = TableAmbience.create(
        this.t(`feature.ambience.kind.${patch.kind}`),
        patch.kind as AmbienceKind,
        patch.rect.w,
        patch.rect.h
      );
      ambience.ambienceDensity = patch.density;
      ambience.isLock = true;
      const at = blockOrigin(patch.rect, grid);
      ambience.location = { name: 'table', x: at.x, y: at.y };
      ambience.posZ = 0;
      table.appendChild(ambience);
      ambience.update();
    }
  }

  /** A light of its own for each spot, a child of the table so the table takes it away again. */
  private standLights(table: GameTable, lights: readonly MapLight[], wallHeight: number, grid: MapGrid): void {
    for (const light of lights) {
      const source = LightSource.create(this.t(`feature.light.skin.${LIGHT_SKIN[light.kind]}`));
      applyLightPreset(source, LIGHT_PRESET[light.kind]);
      source.lightEnabled = true;
      source.lightDirection = light.kind === 'sconce' ? light.facing : 0;
      source.isLock = true;
      const element = source.imageDataElement?.getFirstElementByName('imageIdentifier');
      if (element) element.value = this.registerAsset(LIGHT_SKIN_ASSET_URLS[LIGHT_SKIN[light.kind]]);
      const at = blockOrigin({ x: light.x, y: light.y, w: 1, h: 1 }, grid);
      source.location = { name: 'table', x: at.x, y: at.y };
      source.posZ = 0;
      source.altitude = WALL_MOUNTED.includes(light.kind) ? Math.max(0, wallHeight - 1) : 0;
      table.appendChild(source);
      source.update();
    }
  }
}
