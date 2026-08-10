import type { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { buildReplayBoardScene, collectBoardAssetIds, framingOf } from '@axe/domain/replay/replay-board-view';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';
import { GameTable } from '@axe/domain/tabletop/game-table';

function table(identifier: string, overrides: Record<string, unknown> = {}): ReplayObjectSnapshot {
  return {
    identifier,
    aliasName: 'game-table',
    syncData: {
      attributes: { width: 30, height: 20, gridSize: 40, imageIdentifier: `top-${identifier}`, ...overrides },
    },
  };
}

function selecter(viewTableIdentifier: string): ReplayObjectSnapshot {
  return { identifier: 'TableSelecter', aliasName: 'TableSelecter', syncData: { attributes: { viewTableIdentifier } } };
}

function piece(identifier: string, aliasName: string, attributes: Record<string, unknown> = {}): ReplayObjectSnapshot {
  return {
    identifier,
    aliasName,
    syncData: { attributes: { location: { name: 'table', x: 100, y: 200 }, posZ: 0, ...attributes } },
  };
}

function data(identifier: string, parent: string, name: string, value: unknown): ReplayObjectSnapshot {
  return { identifier, aliasName: 'data', syncData: { value, parentIdentifier: parent, attributes: { name } } };
}

describe('buildReplayBoardScene()', () => {
  it('選ばれている卓の大きさと絵を返すこと', () => {
    const scene = buildReplayBoardScene([table('t1'), table('t2'), selecter('t2')])!;

    expect(scene).toMatchObject({ width: 30, height: 20, gridSize: 40, imageIdentifier: 'top-t2' });
  });

  it('選ばれていなければ最初の卓を使うこと', () => {
    expect(buildReplayBoardScene([table('t1'), table('t2')])?.imageIdentifier).toBe('top-t1');
  });

  it('卓が無ければ盤面を作らないこと', () => {
    expect(buildReplayBoardScene([piece('c1', 'character')])).toBeNull();
  });

  it('卓に出ているコマを置き場所つきで返すこと', () => {
    const scene = buildReplayBoardScene([
      table('t1'),
      piece('c1', 'character', { location: { name: 'table', x: 120, y: 80 }, posZ: 5, rotate: 90 }),
      data('d1', 'c1', 'common', ''),
      data('d2', 'd1', 'name', '盗賊'),
      data('d3', 'd1', 'size', 2),
      data('d4', 'c1', 'image', ''),
      data('d5', 'd4', 'imageIdentifier', 'img-1'),
    ])!;

    expect(scene.pieces).toEqual([
      {
        identifier: 'c1',
        aliasName: 'character',
        x: 120,
        y: 80,
        z: 5,
        size: 2,
        rotate: 90,
        name: '盗賊',
        imageIdentifier: 'img-1',
      },
    ]);
  });

  it('しまわれているコマは盤面に出さないこと', () => {
    const scene = buildReplayBoardScene([
      table('t1'),
      piece('c1', 'character', { location: { name: 'stand', x: 0, y: 0 } }),
      piece('c2', 'character'),
    ])!;

    expect(scene.pieces.map((one) => one.identifier)).toEqual(['c2']);
  });

  it('コマ以外の同期物は盤面に出さないこと', () => {
    const scene = buildReplayBoardScene([table('t1'), piece('m1', 'chat'), piece('c1', 'card')])!;
    expect(scene.pieces.map((one) => one.identifier)).toEqual(['c1']);
  });

  it('高さと奥行きの順に重ねること', () => {
    const scene = buildReplayBoardScene([
      table('t1'),
      piece('a', 'character', { location: { name: 'table', x: 0, y: 300 }, posZ: 0 }),
      piece('b', 'character', { location: { name: 'table', x: 0, y: 100 }, posZ: 0 }),
      piece('c', 'character', { location: { name: 'table', x: 0, y: 0 }, posZ: 9 }),
    ])!;

    expect(scene.pieces.map((one) => one.identifier)).toEqual(['b', 'a', 'c']);
  });

  it('大きさが無いコマは 1 マスとして扱うこと', () => {
    const scene = buildReplayBoardScene([table('t1'), piece('c1', 'character')])!;
    expect(scene.pieces[0].size).toBe(1);
  });

  it('壊れた値でも既定に倒すこと', () => {
    const scene = buildReplayBoardScene([
      table('t1', { width: 'ひろい', height: null, gridSize: 0 }),
      piece('c1', 'character', { location: { name: 'table', x: 'よこ', y: 10 } }),
    ])!;

    expect(scene).toMatchObject({ width: 20, height: 20, gridSize: 1 });
    expect(scene.pieces[0].x).toBe(0);
  });
});

describe('framingOf()', () => {
  it('コマの居る辺りに余白を足して切り取ること', () => {
    const scene = buildReplayBoardScene([
      table('t1', { width: 40, height: 40, gridSize: 50 }),
      piece('c1', 'character', { location: { name: 'table', x: 1000, y: 1000 } }),
    ])!;

    expect(framingOf(scene)).toEqual({ x: 900, y: 900, width: 250, height: 250 });
  });

  it('卓の外まではみ出さないこと', () => {
    const scene = buildReplayBoardScene([
      table('t1', { width: 4, height: 4, gridSize: 50 }),
      piece('c1', 'character', { location: { name: 'table', x: 0, y: 0 } }),
    ])!;

    expect(framingOf(scene)).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it('コマが無ければ卓ぜんたいを映すこと', () => {
    const scene = buildReplayBoardScene([table('t1', { width: 10, height: 8, gridSize: 50 })])!;
    expect(framingOf(scene)).toEqual({ x: 0, y: 0, width: 500, height: 400 });
  });
});

describe('collectBoardAssetIds()', () => {
  it('卓とコマの絵をまとめて返すこと', () => {
    const scene = buildReplayBoardScene([
      table('t1', { backgroundImageIdentifier: 'bg-1' }),
      piece('c1', 'character'),
      data('d4', 'c1', 'image', ''),
      data('d5', 'd4', 'imageIdentifier', 'img-1'),
    ]);

    expect(collectBoardAssetIds(scene)).toEqual(['top-t1', 'bg-1', 'img-1']);
  });

  it('盤面が無ければ何も返さないこと', () => {
    expect(collectBoardAssetIds(null)).toEqual([]);
  });
});

describe('本物のコマから起こすとき', () => {
  const mine: GameObject[] = [];

  afterEach(() => {
    for (const object of mine.splice(0)) ObjectStore.instance.remove(object);
  });

  function keep<T extends GameObject>(object: T): T {
    mine.push(object);
    return object;
  }

  /** 同じ卓を見ている他のテストと混ざらないよう、自分が作った物だけを写す。 */
  function snapshotStore(root: GameObject): ReplayObjectSnapshot[] {
    const wanted = new Set(mine.map((object) => object.identifier));
    const descend = (identifier: string): void => {
      for (const object of ObjectStore.instance.getObjects()) {
        const parent = String((object.toContext().syncData as Record<string, unknown>)['parentIdentifier'] ?? '');
        if (parent === identifier && !wanted.has(object.identifier)) {
          wanted.add(object.identifier);
          descend(object.identifier);
        }
      }
    };
    descend(root.identifier);

    return ObjectStore.instance
      .getObjects()
      .filter((object) => wanted.has(object.identifier))
      .map((object) => {
        const context = object.toContext();
        return {
          identifier: context.identifier,
          aliasName: context.aliasName,
          syncData: context.syncData as Record<string, unknown>,
        };
      });
  }

  it('実際のキャラクターから名前と絵と大きさを読めること', () => {
    const table = keep(new GameTable('board-view-table'));
    table.width = 12;
    table.height = 8;
    table.gridSize = 50;
    ObjectStore.instance.add(table, false);

    const character = keep(GameCharacter.create('盗賊', 2, 'img-1'));
    character.location.x = 150;
    character.location.y = 100;

    const scene = buildReplayBoardScene(snapshotStore(character))!;
    const piece = scene.pieces.find((one) => one.identifier === character.identifier)!;

    expect(scene).toMatchObject({ width: 12, height: 8, gridSize: 50 });
    expect(piece).toMatchObject({ name: '盗賊', imageIdentifier: 'img-1', size: 2, x: 150, y: 100 });
  });

  it('しまったキャラクターは実物でも盤面から外れること', () => {
    ObjectStore.instance.add(keep(new GameTable('board-view-empty')), false);
    const character = keep(GameCharacter.create('盗賊', 1, 'img-1'));
    character.setLocation('stand');

    const scene = buildReplayBoardScene(snapshotStore(character))!;
    expect(scene.pieces.some((one) => one.identifier === character.identifier)).toBe(false);
  });
});
