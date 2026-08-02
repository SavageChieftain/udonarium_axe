import { TestBed } from '@angular/core/testing';
import { CcfoliaRoomImportService } from '@axe/application/tabletop/ccfolia-room-import.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ArchiveEntries } from '@axe/core/storage/room-archive';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DisclosureMode } from '@axe/domain/disclosure/disclosure';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function entriesOf(data: unknown, images: string[] = []): ArchiveEntries {
  const entries: ArchiveEntries = {
    '__data.json': new TextEncoder().encode(JSON.stringify(data)),
  };
  for (const image of images) entries[image] = new Uint8Array([1, 2, 3]);
  return entries;
}

function roomData(entities: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    meta: { version: '1.1.0' },
    entities: {
      room: { backgroundUrl: 'bg.jpeg', fieldWidth: 20, fieldHeight: 10 },
      items: {},
      decks: {},
      characters: {},
      effects: {},
      scenes: {},
      ...entities,
    },
    resources: {
      'bg.jpeg': { type: 'image/jpeg' },
      'icon.png': { type: 'image/png' },
      'face.png': { type: 'image/png' },
    },
  };
}

describe('CcfoliaRoomImportService', () => {
  let service: CcfoliaRoomImportService;
  let addAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    let counter = 0;
    addAsync = vi.fn().mockImplementation(() => Promise.resolve({ identifier: `image-${++counter}` }));

    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, { provide: ImageStorage, useValue: { addAsync } }],
    });
    service = TestBed.inject(CcfoliaRoomImportService);
  });

  function tables(): GameTable[] {
    return ObjectStore.instance.getObjects<GameTable>(GameTable);
  }

  it('場面が無いルームはテーブルを 1 枚だけ作る', async () => {
    const before = tables().length;

    const result = await service.importAsync(entriesOf(roomData(), ['bg.jpeg']));

    expect(result.error).toBeNull();
    const table = tables()[tables().length - 1];
    expect(tables()).toHaveLength(before + 1);
    expect(table.width).toBe(20);
    expect(table.height).toBe(10);
    expect(table.gridSize).toBe(50);
    expect(result.summary!.tableCount).toBe(1);
    expect(result.summary!.tableName).toBe(table.name);
  });

  it('前景を盤面の絵、背景を周囲の壁紙として割り当てる', async () => {
    const data = roomData();
    (data['entities'] as Record<string, unknown>)['room'] = {
      backgroundUrl: 'bg.jpeg',
      foregroundUrl: 'icon.png',
      fieldWidth: 20,
      fieldHeight: 10,
    };

    await service.importAsync(entriesOf(data, ['bg.jpeg', 'icon.png']));

    const table = tables()[tables().length - 1];
    expect(table.imageIdentifier).toBe('image-2');
    expect(table.backgroundImageIdentifier).toBe('image-1');
  });

  it('盤面サイズが無いルームは既定の広さで作る', async () => {
    const data = roomData();
    (data['entities'] as Record<string, unknown>)['room'] = { backgroundUrl: null };

    await service.importAsync(entriesOf(data));

    const table = tables()[tables().length - 1];
    expect(table.width).toBe(20);
    expect(table.height).toBe(20);
  });

  it('items を地形パネルとしてテーブルに載せる', async () => {
    const result = await service.importAsync(
      entriesOf(
        roomData({
          items: {
            aaaaaaaaaaaaaaaaaaaa: {
              x: 0,
              y: 0,
              width: 4,
              height: 2,
              angle: 45,
              locked: true,
              visible: true,
              type: 'plane',
              memo: '床',
              imageUrl: 'icon.png',
              order: 0,
            },
          },
        }),
        ['bg.jpeg', 'icon.png']
      )
    );

    const table = tables()[tables().length - 1];
    const terrains = table.children.filter((child): child is Terrain => child instanceof Terrain);
    expect(terrains).toHaveLength(1);
    expect(terrains[0].name).toBe('床');
    expect(terrains[0].width).toBe(4);
    expect(terrains[0].depth).toBe(2);
    expect(terrains[0].isLocked).toBe(true);
    expect(terrains[0].rotate).toBe(45);
    expect(terrains[0].blocksSight).toBe(false);
    expect(terrains[0].location.x).toBe(500);
    expect(terrains[0].location.y).toBe(250);
    expect(result.summary!.panelCount).toBe(1);
  });

  it('非表示のパネルは取り込まず件数だけ返す', async () => {
    const result = await service.importAsync(
      entriesOf(
        roomData({
          items: {
            aaaaaaaaaaaaaaaaaaaa: { x: 0, y: 0, width: 1, height: 1, visible: false, imageUrl: 'icon.png' },
          },
        }),
        ['bg.jpeg', 'icon.png']
      )
    );

    const table = tables()[tables().length - 1];
    expect(table.children.filter((child) => child instanceof Terrain)).toHaveLength(0);
    expect(result.summary!.panelCount).toBe(0);
    expect(result.summary!.hiddenPanelCount).toBe(1);
  });

  it('characters をコマとして配置し、立ち絵差分を画像に加える', async () => {
    const before = ObjectStore.instance.getObjects<GameCharacter>(GameCharacter).length;

    const result = await service.importAsync(
      entriesOf(
        roomData({
          characters: {
            aaaaaaaaaaaaaaaaaaaa: {
              name: '探索者A',
              iconUrl: 'icon.png',
              faces: [{ label: '笑顔', iconUrl: 'face.png' }],
              x: 100,
              y: 50,
              angle: 90,
              width: 1,
              height: 1,
              secret: true,
              status: [{ label: 'HP', value: 8, max: 12 }],
            },
          },
        }),
        ['bg.jpeg', 'icon.png', 'face.png']
      )
    );

    const characters = ObjectStore.instance.getObjects<GameCharacter>(GameCharacter);
    expect(characters).toHaveLength(before + 1);
    const character = characters[characters.length - 1];
    expect(character.name).toBe('探索者A');
    expect(character.location.x).toBe(700);
    expect(character.location.y).toBe(350);
    expect(character.rotate).toBe(90);
    expect(character.disclosureMode).toBe(DisclosureMode.GameMaster);
    expect(character.imageDataElement!.children.map((child) => child.name)).toContain('笑顔');
    expect(result.summary!.pieceCount).toBe(1);
  });

  it('場面ごとにテーブルを作り、パネルを全テーブルへ複製する', async () => {
    const before = tables().length;
    const data = roomData({
      items: {
        aaaaaaaaaaaaaaaaaaaa: { x: 0, y: 0, width: 2, height: 2, imageUrl: 'icon.png', order: 0 },
      },
      scenes: {
        s1: { name: '前景なし', order: 0, backgroundUrl: 'bg.jpeg', foregroundUrl: null },
        s2: { name: '戦闘シート', order: 1, backgroundUrl: 'bg.jpeg', foregroundUrl: 'face.png' },
      },
    });
    (data['entities'] as Record<string, unknown>)['room'] = {
      backgroundUrl: 'bg.jpeg',
      foregroundUrl: 'face.png',
      fieldWidth: 20,
      fieldHeight: 10,
    };

    const result = await service.importAsync(entriesOf(data, ['bg.jpeg', 'icon.png', 'face.png']));

    const created = tables().slice(before);
    expect(created.map((table) => table.name)).toEqual(['前景なし', '戦闘シート']);
    expect(created[0].imageIdentifier).toBe('');
    expect(created[1].imageIdentifier).toBe('image-3');
    for (const table of created) {
      expect(table.children.filter((child) => child instanceof Terrain)).toHaveLength(1);
    }
    expect(result.summary!.tableCount).toBe(2);
    expect(result.summary!.panelCount).toBe(1);
  });

  it('ルームの現在の前景と一致する場面のテーブルを表示する', async () => {
    const data = roomData({
      scenes: {
        s1: { name: '前景なし', order: 0, backgroundUrl: 'bg.jpeg', foregroundUrl: null },
        s2: { name: '戦闘シート', order: 1, backgroundUrl: 'bg.jpeg', foregroundUrl: 'face.png' },
      },
    });
    (data['entities'] as Record<string, unknown>)['room'] = {
      backgroundUrl: 'bg.jpeg',
      foregroundUrl: 'face.png',
      fieldWidth: 20,
      fieldHeight: 10,
    };

    const result = await service.importAsync(entriesOf(data, ['bg.jpeg', 'face.png']));

    expect(result.summary!.tableName).toBe('戦闘シート');
  });

  it('盤外に置かれたパネルとコマをテーブルの外側のまま再現する', async () => {
    await service.importAsync(
      entriesOf(
        roomData({
          items: {
            aaaaaaaaaaaaaaaaaaaa: { x: -14, y: -9, width: 3, height: 3, imageUrl: 'icon.png', order: 0 },
          },
          characters: {
            bbbbbbbbbbbbbbbbbbbb: { name: '説明', x: -350, y: -225, width: 3, height: 3 },
          },
        }),
        ['bg.jpeg', 'icon.png']
      )
    );

    const table = tables()[tables().length - 1];
    const terrain = table.children.find((child): child is Terrain => child instanceof Terrain)!;
    expect(terrain.location.x).toBe(-200);
    expect(terrain.location.y).toBe(-200);

    const characters = ObjectStore.instance.getObjects<GameCharacter>(GameCharacter);
    const character = characters[characters.length - 1];
    expect(character.location.x).toBe(-200);
    expect(character.location.y).toBe(-200);
  });

  it('未対応の要素の件数を結果に載せる', async () => {
    const result = await service.importAsync(
      entriesOf(roomData({ decks: { d1: {} }, effects: { e1: {}, e2: {} } }), ['bg.jpeg'])
    );

    expect(result.summary!.skipped).toEqual({ panels: 0, decks: 1, effects: 2 });
  });

  it('ルームデータでない ZIP は unrecognized を返す', async () => {
    const before = tables().length;

    await expect(service.importAsync({})).resolves.toEqual({ summary: null, error: 'unrecognized' });
    await expect(service.importAsync(entriesOf({ kind: 'character', data: { name: 'A' } }))).resolves.toEqual({
      summary: null,
      error: 'unrecognized',
    });
    expect(tables()).toHaveLength(before);
  });

  it('壊れた __data.json でも例外を投げずに unrecognized を返す', async () => {
    const result = await service.importAsync({ '__data.json': new TextEncoder().encode('{ broken') });

    expect(result).toEqual({ summary: null, error: 'unrecognized' });
  });
});
