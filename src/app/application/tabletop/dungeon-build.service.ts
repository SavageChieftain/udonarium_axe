import { inject, Injectable } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { DisclosureMode } from '@axe/domain/disclosure/disclosure';
import { ImageTag } from '@axe/domain/media/image-tag';
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
import { DungeonBlock, DungeonBlocks } from '@axe/domain/tabletop/dungeon/dungeon-blocks';
import { DungeonLayout } from '@axe/domain/tabletop/dungeon/dungeon-layout';
import { buildDungeonSummary } from '@axe/domain/tabletop/dungeon/dungeon-summary';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { SlopeDirection, Terrain, TerrainViewState } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { applyLightPreset, LightAnimation, LightPreset } from '@axe/domain/tabletop/vision-types';

const TERRAIN_IMAGE_TAG = '地形';
const GRID_SIZE = 50;
const FLOOR_HEIGHT = 0.05;
/** How many terrains go in before the thread is handed back, so the panel can move its bar. */
const CHUNK_SIZE = 32;

export type DungeonMaterial = { kind: 'texture'; id: string } | { kind: 'library'; identifier: string };

export interface DungeonBuildOptions {
  name: string;
  wall: DungeonMaterial;
  floor: DungeonMaterial;
  placeRoomNotes: boolean;
  placeSummary: boolean;
  placeScratchMask: boolean;
}

export interface DungeonBuildResult {
  table: GameTable;
  terrainCount: number;
  /**
   * The notes this run left behind.
   *
   * A shared memo is not a child of its table, so destroying the table would leave them on
   * every other one. The caller keeps these to clear them when the dungeon is rolled again.
   */
  noteIdentifiers: string[];
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
      table.appendChild(this.createTerrain(block, atmosphere, { wallSide, wallTop, floor, hazard }));
      done++;
      if (done % CHUNK_SIZE === 0) {
        onProgress?.(done, blocks.blocks.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    onProgress?.(blocks.blocks.length, blocks.blocks.length);

    const noteIdentifiers: string[] = [];
    if (options.placeRoomNotes) noteIdentifiers.push(...this.placeRoomNotes(layout));
    if (options.placeSummary) noteIdentifiers.push(this.placeSummary(layout, blocks, options.name));
    if (options.placeScratchMask) this.placeScratchMask(table, layout);

    return { table, terrainCount: blocks.blocks.length, noteIdentifiers };
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
    images: { wallSide: string; wallTop: string; floor: string; hazard: string }
  ): Terrain {
    const { rect } = block;
    const name = this.terrainName(block);
    const terrain = this.terrainFor(block, atmosphere, images, name);

    terrain.isTiledTexture = true;
    terrain.isLocked = true;
    terrain.blocksSight = block.blocksSight;
    terrain.blocksLight = block.blocksSight;

    if (block.torch) {
      terrain.lightEnabled = true;
      applyLightPreset(terrain, LightPreset.TORCH);
      terrain.lightPreset = LightPreset.TORCH;
      terrain.lightAnimation = LightAnimation.FLICKER;
    }

    // Writing the whole location goes through setAttribute, which syncs; touching location.x does not.
    terrain.location = { name: 'table', x: rect.x * GRID_SIZE, y: rect.y * GRID_SIZE };
    terrain.posZ = 0;
    return terrain;
  }

  private terrainFor(
    block: DungeonBlock,
    atmosphere: DungeonAtmosphere,
    images: { wallSide: string; wallTop: string; floor: string; hazard: string },
    name: string
  ): Terrain {
    const { rect } = block;
    switch (block.kind) {
      case 'wall': {
        const terrain = Terrain.create(name, rect.w, rect.h, atmosphere.wallHeight, images.wallSide, images.wallTop);
        terrain.mode = TerrainViewState.ALL;
        return terrain;
      }
      case 'door': {
        const door = this.registerAsset(DUNGEON_PROP_ASSET_URLS[this.doorPropFor(atmosphere)]);
        const terrain = Terrain.create(name, rect.w, rect.h, atmosphere.wallHeight, door, door);
        terrain.mode = TerrainViewState.ALL;
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

  private placeRoomNotes(layout: DungeonLayout): string[] {
    const identifiers: string[] = [];
    for (const room of layout.rooms) {
      const note = TextNote.create(
        `#${room.index + 1}`,
        this.t(`feature.tabletop.dungeonGenerator.role.${room.role}`),
        14,
        2,
        1
      );
      note.location = {
        name: 'table',
        x: (room.x + Math.floor(room.w / 2)) * GRID_SIZE,
        y: (room.y + Math.floor(room.h / 2)) * GRID_SIZE,
      };
      note.posZ = 0;
      note.disclosureMode = DisclosureMode.GameMaster;
      note.update();
      identifiers.push(note.identifier);
    }
    return identifiers;
  }

  private placeSummary(layout: DungeonLayout, blocks: DungeonBlocks, name: string): string {
    const text = buildDungeonSummary({
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
      },
    });

    const note = TextNote.create(this.t('feature.tabletop.dungeonGenerator.summary.title'), text, 12, 8, 10);
    note.location = { name: 'table', x: 0, y: 0 };
    note.posZ = 0;
    note.disclosureMode = DisclosureMode.GameMaster;
    note.update();
    return note.identifier;
  }

  private placeScratchMask(table: GameTable, layout: DungeonLayout): void {
    const mask = GameTableScratchMask.create(
      this.t('feature.tabletop.dungeonGenerator.piece.fog'),
      layout.width,
      layout.height,
      100
    );
    mask.location = { name: 'table', x: 0, y: 0 };
    mask.posZ = 0;
    table.appendChild(mask);
  }
}
