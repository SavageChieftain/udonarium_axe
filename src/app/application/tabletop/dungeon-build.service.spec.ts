import { TestBed } from '@angular/core/testing';
import { DungeonBuildService } from '@axe/application/tabletop/dungeon-build.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DisclosureMode } from '@axe/domain/disclosure/disclosure';
import { ImageTag } from '@axe/domain/media/image-tag';
import { WALL_TEXTURE_ASSET_URLS } from '@axe/domain/media/texture-catalog';
import { atmosphereById } from '@axe/domain/tabletop/dungeon/dungeon-atmosphere';
import { planDungeon } from '@axe/domain/tabletop/dungeon/dungeon-generator';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { TerrainViewState } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

const GRID = 50;

function options(overrides: Partial<Parameters<DungeonBuildService['build']>[3]> = {}) {
  return {
    name: 'Test dungeon',
    wall: { kind: 'texture' as const, id: 'wall_ashlar' },
    floor: { kind: 'texture' as const, id: 'stone_paving_big' },
    placeRoomNotes: false,
    placeSummary: false,
    placeScratchMask: false,
    ...overrides,
  };
}

describe('DungeonBuildService', () => {
  let service: DungeonBuildService;
  let store: ObjectStore;

  function wipe(): void {
    for (const object of store.getObjects()) store.delete(object, false);
    store.clearDeleteHistory();
    // The picture store outlives the object store, so a tag made in one test would look missing in the next.
    for (const image of ImageStorage.instance.images) ImageStorage.instance.delete(image.identifier);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    store = ObjectStore.instance;
    wipe();
    service = TestBed.inject(DungeonBuildService);
  });

  afterEach(() => {
    wipe();
    vi.clearAllMocks();
  });

  async function build(overrides: Partial<ReturnType<typeof options>> = {}) {
    const plan = planDungeon({ atmosphere: 'stoneDungeon', roomCount: 8, seed: 7 });
    const result = await service.build(plan.layout, plan.atmosphere, plan.blocks, options(overrides));
    return { plan, result };
  }

  it('builds one table and leaves no other behind', async () => {
    const { result } = await build();

    expect(store.getObjects(GameTable).length).toBe(1);
    expect(store.getObjects(GameTable)[0]).toBe(result.table);
  });

  it('sizes the table to the dungeon and pins it to squares', async () => {
    const { plan, result } = await build();

    expect(result.table.width).toBe(plan.layout.width);
    expect(result.table.height).toBe(plan.layout.height);
    expect(result.table.gridSize).toBe(GRID);
    expect(result.table.gridType).toBe(GridType.SQUARE);
  });

  it('puts one terrain on the table for every block', async () => {
    const { plan, result } = await build();

    expect(result.terrainCount).toBe(plan.blocks.blocks.length);
    expect(result.table.terrains.length).toBe(plan.blocks.blocks.length);
  });

  it('gives each terrain the width, depth and height of its block', async () => {
    // Terrain.create takes name, width, depth, height: the depth comes third, which reads backwards.
    const { plan, result } = await build();
    const atmosphere = atmosphereById('stoneDungeon');

    plan.blocks.blocks.forEach((block, index) => {
      const terrain = result.table.terrains[index];
      expect(terrain.width).toBe(block.rect.w);
      expect(terrain.depth).toBe(block.rect.h);
      if (block.kind === 'wall') expect(terrain.height).toBe(atmosphere.wallHeight);
    });
  });

  it('places each terrain at its cell times the grid', async () => {
    const { plan, result } = await build();

    plan.blocks.blocks.forEach((block, index) => {
      const terrain = result.table.terrains[index];
      expect(terrain.location.x).toBe(block.rect.x * GRID);
      expect(terrain.location.y).toBe(block.rect.y * GRID);
      expect(terrain.location.name).toBe('table');
    });
  });

  it('lifts a stair clear of the floor it stands on', async () => {
    const { plan, result } = await build();
    const stairIndex = plan.blocks.blocks.findIndex((block) => block.kind === 'stairUp');
    const floorIndex = plan.blocks.blocks.findIndex((block) => block.kind === 'floor');

    expect(stairIndex).toBeGreaterThanOrEqual(0);
    expect(result.table.terrains[stairIndex].posZ).toBeGreaterThan(result.table.terrains[floorIndex].posZ);
  });

  it('gives a lit wall the radius and colour of a torch', async () => {
    const { result } = await build();
    const lit = result.table.terrains.find((terrain) => terrain.lightEnabled);

    expect(lit).toBeDefined();
    expect(lit!.lightPreset).toBe('torch');
    expect(lit!.lightBrightRadius).toBeGreaterThan(0);
  });

  it('shows walls whole and floors flat', async () => {
    const { plan, result } = await build();

    plan.blocks.blocks.forEach((block, index) => {
      const terrain = result.table.terrains[index];
      if (block.kind === 'wall') expect(terrain.mode).toBe(TerrainViewState.ALL);
      if (block.kind === 'floor') expect(terrain.mode).toBe(TerrainViewState.FLOOR);
    });
  });

  it('locks every piece and tiles its texture', async () => {
    const { result } = await build();

    for (const terrain of result.table.terrains) {
      expect(terrain.isLocked).toBe(true);
      expect(terrain.isTiledTexture).toBe(true);
    }
  });

  it('stops sight only where the block says to', async () => {
    const { plan, result } = await build();

    plan.blocks.blocks.forEach((block, index) => {
      expect(result.table.terrains[index].blocksSight).toBe(block.blocksSight);
    });
  });

  it('lights the walls the plan asked to light', async () => {
    const { plan, result } = await build();
    const lit = plan.blocks.blocks.filter((block) => block.torch).length;

    expect(result.table.terrains.filter((terrain) => terrain.lightEnabled).length).toBe(lit);
  });

  it('registers a bundled picture once and tags it', async () => {
    await build();
    const url = WALL_TEXTURE_ASSET_URLS.wall_ashlar;
    const image = ImageStorage.instance.get(url);

    expect(image).not.toBeNull();
    expect(ImageTag.get(image!.identifier)?.tag).toBe('地形');

    await build();
    expect(ImageStorage.instance.get(url)).toBe(image);
  });

  it('leaves a tag someone else already set alone', async () => {
    const url = WALL_TEXTURE_ASSET_URLS.wall_ashlar;
    ImageStorage.instance.add(url);
    ImageTag.create(url).tag = 'テクスチャ';

    await build();

    expect(ImageTag.get(url)?.tag).toBe('テクスチャ');
  });

  it('takes a picture from the library as it is', async () => {
    const { result } = await build({ floor: { kind: 'library', identifier: 'some-hash' } });
    const floor = result.table.terrains.find((terrain) => terrain.mode === TerrainViewState.FLOOR);

    expect(floor?.imageDataElement?.getFirstElementByName('floor')?.value).toBe('some-hash');
  });

  it('never switches the table on its own', async () => {
    const { result } = await build();

    expect(result.table.selected).toBe(false);
  });

  it('clears every terrain out of the store when the table goes', async () => {
    const { result } = await build();
    const identifiers = result.table.terrains.map((terrain) => terrain.identifier);

    result.table.destroy();

    for (const identifier of identifiers) expect(store.get(identifier)).toBeNull();
  });

  it('lays one scratch mask over the whole board when asked', async () => {
    const { plan, result } = await build({ placeScratchMask: true });
    const masks = store.getObjects(GameTableScratchMask);

    expect(masks.length).toBe(1);
    expect(masks[0].width).toBe(plan.layout.width);
    expect(masks[0].height).toBe(plan.layout.height);
    expect(result.table.scratchMasks.length).toBe(1);
  });

  it('writes the notes for the master alone and hands back their identifiers', async () => {
    const { plan, result } = await build({ placeRoomNotes: true, placeSummary: true });
    const notes = store.getObjects(TextNote);

    expect(notes.length).toBe(plan.layout.rooms.length + 1);
    for (const note of notes) expect(note.disclosureMode).toBe(DisclosureMode.GameMaster);
    expect(result.noteIdentifiers.length).toBe(notes.length);
  });

  it('leaves the notes out when they are not wanted', async () => {
    const { result } = await build();

    expect(store.getObjects(TextNote).length).toBe(0);
    expect(result.noteIdentifiers).toEqual([]);
  });

  it('tells the caller how far it has got', async () => {
    const plan = planDungeon({ atmosphere: 'stoneDungeon', roomCount: 8, seed: 7 });
    const seen: number[] = [];

    await service.build(plan.layout, plan.atmosphere, plan.blocks, options(), (done) => seen.push(done));

    expect(seen.length).toBeGreaterThan(1);
    expect(seen[seen.length - 1]).toBe(plan.blocks.blocks.length);
  });

  it('builds a cave with its hazard floor', async () => {
    const plan = planDungeon({ atmosphere: 'lavaCavern', roomCount: 8, seed: 7 });
    const result = await service.build(
      plan.layout,
      plan.atmosphere,
      plan.blocks,
      options({ wall: { kind: 'texture', id: 'wall_obsidian' }, floor: { kind: 'texture', id: 'obsidian' } })
    );

    expect(result.table.terrains.length).toBe(plan.blocks.blocks.length);
    expect(ImageStorage.instance.get('assets/images/tiles/lava.webp')).not.toBeNull();
  });
});
