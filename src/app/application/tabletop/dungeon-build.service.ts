import { inject, Injectable } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ImageTag } from '@axe/domain/media/image-tag';
import { LIGHT_SKIN_ASSET_URLS, LightSkinId } from '@axe/domain/media/light-skins';
import {
  DUNGEON_PROP_ASSET_URLS,
  DungeonPropId,
  TEXTURE_ASSET_URLS,
  TextureId,
  WALL_TEXTURE_ASSET_URLS,
  WALL_TOP_TEXTURE,
  WallTextureId,
} from '@axe/domain/media/texture-catalog';
import { DungeonAtmosphere } from '@axe/domain/tabletop/dungeon/dungeon-atmosphere';
import {
  DungeonBlock,
  DungeonBlocks,
  DungeonLight,
  DungeonLightKind,
} from '@axe/domain/tabletop/dungeon/dungeon-blocks';
import { DungeonLayout } from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { buildDungeonSummary } from '@axe/domain/tabletop/dungeon/dungeon-summary';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { LightSource } from '@axe/domain/tabletop/light-source';
import { SlopeDirection, Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';
import { applyLightPreset, LightPreset } from '@axe/domain/tabletop/vision-types';

const TERRAIN_IMAGE_TAG = '地形';
const GRID_SIZE = 50;
const FLOOR_HEIGHT = 0.05;
/** How deep a door slab is, so it reads as a door in the passage rather than a block filling it. */
const DOOR_THICKNESS = 0.25;

const LIGHT_PRESET: Record<DungeonLightKind, LightPreset> = {
  sconce: LightPreset.SCONCE,
  campfire: LightPreset.CAMPFIRE,
  brazier: LightPreset.BRAZIER,
  stand: LightPreset.LANTERN,
  lantern: LightPreset.LANTERN,
};

/** A stand and a lantern burn alike but do not look alike, so the picture follows the kind. */
const LIGHT_SKIN: Record<DungeonLightKind, LightSkinId> = {
  sconce: 'light_sconce',
  campfire: 'light_campfire',
  brazier: 'light_brazier',
  stand: 'light_stand',
  lantern: 'light_lantern',
};
const WALL_MOUNTED: readonly DungeonLightKind[] = ['sconce', 'lantern'];

/** How many terrains go in before the thread is handed back, so the panel can move its bar. */
const CHUNK_SIZE = 32;

function onTopOfFloor(block: DungeonBlock): boolean {
  return block.kind === 'stairUp' || block.kind === 'stairDown';
}

export type DungeonMaterial = { kind: 'texture'; id: string } | { kind: 'library'; identifier: string };

export interface DungeonBuildOptions {
  name: string;
  wall: DungeonMaterial;
  floor: DungeonMaterial;
  /** How tall the walls stand, in cells. The atmosphere suggests one; the panel may override it. */
  wallHeight: number;
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
    layout: DungeonLayout,
    atmosphere: DungeonAtmosphere,
    blocks: DungeonBlocks,
    options: DungeonBuildOptions,
    onProgress?: (done: number, total: number) => void
  ): Promise<DungeonBuildResult> {
    const wallSide = this.resolveMaterial(options.wall, WALL_TEXTURE_ASSET_URLS);
    const wallTop =
      options.wall.kind === 'texture'
        ? this.registerAsset(TEXTURE_ASSET_URLS[WALL_TOP_TEXTURE[options.wall.id as WallTextureId]] ?? '')
        : wallSide;
    const floor = this.resolveMaterial(options.floor, TEXTURE_ASSET_URLS);
    const hazard = atmosphere.cave?.hazardFloor
      ? this.registerAsset(TEXTURE_ASSET_URLS[atmosphere.cave.hazardFloor as TextureId])
      : floor;

    const table = this.createTable(layout, atmosphere, options.name);

    let done = 0;
    for (const block of blocks.blocks) {
      table.appendChild(
        this.createTerrain(block, atmosphere, { wallSide, wallTop, floor, hazard }, options.wallHeight)
      );
      done++;
      if (done % CHUNK_SIZE === 0) {
        onProgress?.(done, blocks.blocks.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    onProgress?.(blocks.blocks.length, blocks.blocks.length);

    this.standLights(table, blocks.lights, options.wallHeight);

    return {
      table,
      terrainCount: blocks.blocks.length,
      summary: this.describe(layout, blocks, options.name),
    };
  }

  private createTable(layout: DungeonLayout, atmosphere: DungeonAtmosphere, name: string): GameTable {
    const table = new GameTable();
    table.name = name;
    table.width = layout.width;
    table.height = layout.height;
    table.gridSize = GRID_SIZE;
    // A generated dungeon is laid out on squares, and a hex table would clip every block to a ring.
    table.gridType = GridType.SQUARE;
    table.gridShow = atmosphere.gridShow;
    table.imageIdentifier = '';
    table.backgroundImageIdentifier = '';
    table.darknessEnabled = atmosphere.darkness > 0;
    if (atmosphere.darkness > 0) table.darknessLevel = atmosphere.darkness;
    table.ambientColor = atmosphere.ambientColor;
    table.weatherKind = atmosphere.weatherKind;
    table.weatherDensity = atmosphere.weatherDensity;
    table.initialize();
    return table;
  }

  private createTerrain(
    block: DungeonBlock,
    atmosphere: DungeonAtmosphere,
    images: { wallSide: string; wallTop: string; floor: string; hazard: string },
    wallHeight: number
  ): Terrain {
    const { rect } = block;
    const name = this.terrainName(block);
    const terrain = this.terrainFor(block, atmosphere, images, name, wallHeight);

    terrain.isTiledTexture = true;
    terrain.isLocked = true;
    terrain.blocksSight = block.blocksSight;
    terrain.blocksLight = block.blocksSight;

    // A door slab is thinner than its cell, so it is set in the middle of the way it bars.
    const inset = ((1 - DOOR_THICKNESS) / 2) * GRID_SIZE;
    const offsetX = block.kind === 'door' && block.across === 'x' ? inset : 0;
    const offsetY = block.kind === 'door' && block.across === 'y' ? inset : 0;

    // Writing the whole location goes through setAttribute, which syncs; touching location.x does not.
    terrain.location = { name: 'table', x: rect.x * GRID_SIZE + offsetX, y: rect.y * GRID_SIZE + offsetY };
    // A stair shares its cell with the floor under it, and two faces at one height fight.
    terrain.posZ = onTopOfFloor(block) ? Math.ceil(FLOOR_HEIGHT * GRID_SIZE) : 0;
    return terrain;
  }

  private terrainFor(
    block: DungeonBlock,
    atmosphere: DungeonAtmosphere,
    images: { wallSide: string; wallTop: string; floor: string; hazard: string },
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
        const door = this.registerAsset(DUNGEON_PROP_ASSET_URLS[this.doorPropFor(atmosphere)]);
        const acrossX = block.across === 'x';
        const width = acrossX ? DOOR_THICKNESS : rect.w;
        const depth = acrossX ? rect.h : DOOR_THICKNESS;
        const terrain = Terrain.create(name, width, depth, wallHeight, door, door);
        terrain.mode = TerrainViewState.ALL;
        terrain.doorStyle = atmosphere.doorStyle;
        return terrain;
      }
      case 'stairUp':
      case 'stairDown': {
        const prop: DungeonPropId = block.kind === 'stairUp' ? 'stair_up' : 'stair_down';
        const image = this.registerAsset(DUNGEON_PROP_ASSET_URLS[prop]);
        const terrain = Terrain.create(name, rect.w, rect.h, FLOOR_HEIGHT, image, image);
        terrain.mode = TerrainViewState.FLOOR;
        terrain.isSlope = true;
        terrain.slopeDirection = block.kind === 'stairUp' ? SlopeDirection.TOP : SlopeDirection.BOTTOM;
        terrain.isDropShadow = false;
        return terrain;
      }
      case 'hazard': {
        const terrain = Terrain.create(name, rect.w, rect.h, FLOOR_HEIGHT, images.hazard, images.hazard);
        terrain.mode = TerrainViewState.FLOOR;
        terrain.isDropShadow = false;
        return terrain;
      }
      default: {
        const terrain = Terrain.create(name, rect.w, rect.h, FLOOR_HEIGHT, images.floor, images.floor);
        terrain.mode = TerrainViewState.FLOOR;
        terrain.isDropShadow = false;
        return terrain;
      }
    }
  }

  private doorPropFor(atmosphere: DungeonAtmosphere): DungeonPropId {
    if (atmosphere.algorithm === 'cave') return 'door_stone';
    return atmosphere.id === 'crypt' ? 'door_iron_grate' : 'door_wood';
  }

  private terrainName(block: DungeonBlock): string {
    switch (block.kind) {
      case 'wall':
        return this.t('feature.tabletop.dungeonGenerator.piece.wall');
      case 'door':
        return block.locked
          ? this.t('feature.tabletop.dungeonGenerator.piece.doorLocked')
          : this.t('feature.tabletop.dungeonGenerator.piece.door');
      case 'stairUp':
        return this.t('feature.tabletop.dungeonGenerator.piece.entrance');
      case 'stairDown':
        return this.t('feature.tabletop.dungeonGenerator.piece.exit');
      case 'hazard':
        return this.t('feature.tabletop.dungeonGenerator.piece.hazard');
      default:
        return this.t('feature.tabletop.dungeonGenerator.piece.floor');
    }
  }

  /** A light of its own for each spot, a child of the table so the table takes it away again. */
  private standLights(table: GameTable, lights: readonly DungeonLight[], wallHeight: number): void {
    for (const light of lights) {
      const source = LightSource.create(this.t(`feature.light.skin.${LIGHT_SKIN[light.kind]}`));
      applyLightPreset(source, LIGHT_PRESET[light.kind]);
      source.lightEnabled = true;
      source.lightDirection = light.kind === 'sconce' ? light.facing : 0;
      source.isLock = true;
      const element = source.imageDataElement?.getFirstElementByName('imageIdentifier');
      if (element) element.value = this.registerAsset(LIGHT_SKIN_ASSET_URLS[LIGHT_SKIN[light.kind]]);
      source.location = { name: 'table', x: light.x * GRID_SIZE, y: light.y * GRID_SIZE };
      source.posZ = 0;
      source.altitude = WALL_MOUNTED.includes(light.kind) ? Math.max(0, wallHeight - 1) : 0;
      table.appendChild(source);
      source.update();
    }
  }

  private describe(layout: DungeonLayout, blocks: DungeonBlocks, name: string): string {
    return buildDungeonSummary({
      layout,
      name,
      torchRooms: blocks.torchRooms,
      labels: {
        roleName: (role) => this.t(`feature.tabletop.dungeonGenerator.role.${role}`),
        title: this.t('feature.tabletop.dungeonGenerator.summary.seed'),
        start: this.t('feature.tabletop.dungeonGenerator.summary.start'),
        key: this.t('feature.tabletop.dungeonGenerator.summary.key'),
        locked: this.t('feature.tabletop.dungeonGenerator.summary.locked'),
        torch: this.t('feature.tabletop.dungeonGenerator.summary.torch'),
        doors: this.t('feature.tabletop.dungeonGenerator.summary.doors'),
      },
    });
  }
}
