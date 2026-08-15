import type { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerRole } from '@axe/domain/peer/peer-role';
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
  it('returns the size and the picture of the table in use', () => {
    const scene = buildReplayBoardScene([table('t1'), table('t2'), selecter('t2')])!;

    expect(scene).toMatchObject({ width: 30, height: 20, gridSize: 40, imageIdentifier: 'top-t2' });
  });

  it('falls back to the first table when none is', () => {
    expect(buildReplayBoardScene([table('t1'), table('t2')])?.imageIdentifier).toBe('top-t1');
  });

  it('builds no board without a table', () => {
    expect(buildReplayBoardScene([piece('c1', 'character')])).toBeNull();
  });

  it('returns the pieces on the table, each with where it stands', () => {
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

  it('leaves a piece that is put away off the board', () => {
    const scene = buildReplayBoardScene([
      table('t1'),
      piece('c1', 'character', { location: { name: 'stand', x: 0, y: 0 } }),
      piece('c2', 'character'),
    ])!;

    expect(scene.pieces.map((one) => one.identifier)).toEqual(['c2']);
  });

  it('leaves off anything shared that is not a piece', () => {
    const scene = buildReplayBoardScene([table('t1'), piece('m1', 'chat'), piece('c1', 'card')])!;
    expect(scene.pieces.map((one) => one.identifier)).toEqual(['c1']);
  });

  it('stacks them by height and then by depth', () => {
    const scene = buildReplayBoardScene([
      table('t1'),
      piece('a', 'character', { location: { name: 'table', x: 0, y: 300 }, posZ: 0 }),
      piece('b', 'character', { location: { name: 'table', x: 0, y: 100 }, posZ: 0 }),
      piece('c', 'character', { location: { name: 'table', x: 0, y: 0 }, posZ: 9 }),
    ])!;

    expect(scene.pieces.map((one) => one.identifier)).toEqual(['b', 'a', 'c']);
  });

  it('reads a piece with no size as one cell', () => {
    const scene = buildReplayBoardScene([table('t1'), piece('c1', 'character')])!;
    expect(scene.pieces[0].size).toBe(1);
  });

  it('falls back to the defaults for a value it cannot read', () => {
    const scene = buildReplayBoardScene([
      table('t1', { width: 'ひろい', height: null, gridSize: 0 }),
      piece('c1', 'character', { location: { name: 'table', x: 'よこ', y: 10 } }),
    ])!;

    expect(scene).toMatchObject({ width: 20, height: 20, gridSize: 1 });
    expect(scene.pieces[0].x).toBe(0);
  });
});

describe('framingOf()', () => {
  it('crops about the pieces with a margin', () => {
    const scene = buildReplayBoardScene([
      table('t1', { width: 40, height: 40, gridSize: 50 }),
      piece('c1', 'character', { location: { name: 'table', x: 1000, y: 1000 } }),
    ])!;

    expect(framingOf(scene)).toEqual({ x: 900, y: 900, width: 250, height: 250 });
  });

  it('never runs off the table', () => {
    const scene = buildReplayBoardScene([
      table('t1', { width: 4, height: 4, gridSize: 50 }),
      piece('c1', 'character', { location: { name: 'table', x: 0, y: 0 } }),
    ])!;

    expect(framingOf(scene)).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it('shows the whole table when there are no pieces', () => {
    const scene = buildReplayBoardScene([table('t1', { width: 10, height: 8, gridSize: 50 })])!;
    expect(framingOf(scene)).toEqual({ x: 0, y: 0, width: 500, height: 400 });
  });
});

describe('collectBoardAssetIds()', () => {
  it('returns the pictures of the table and the pieces together', () => {
    const scene = buildReplayBoardScene([
      table('t1', { backgroundImageIdentifier: 'bg-1' }),
      piece('c1', 'character'),
      data('d4', 'c1', 'image', ''),
      data('d5', 'd4', 'imageIdentifier', 'img-1'),
    ]);

    expect(collectBoardAssetIds(scene)).toEqual(['top-t1', 'bg-1', 'img-1']);
  });

  it('returns nothing without a board', () => {
    expect(collectBoardAssetIds(null)).toEqual([]);
  });
});

describe('built from real pieces', () => {
  const mine: GameObject[] = [];

  afterEach(() => {
    for (const object of mine.splice(0)) ObjectStore.instance.remove(object);
  });

  function keep<T extends GameObject>(object: T): T {
    mine.push(object);
    return object;
  }

  /** Only what this test made is copied, so it does not mix with another watching the same table. */
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

  it('reads the name, the picture and the size off a real character', () => {
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

  it('leaves a real character that is put away off the board', () => {
    ObjectStore.instance.add(keep(new GameTable('board-view-empty')), false);
    const character = keep(GameCharacter.create('盗賊', 1, 'img-1'));
    character.setLocation('stand');

    const scene = buildReplayBoardScene(snapshotStore(character))!;
    expect(scene.pieces.some((one) => one.identifier === character.identifier)).toBe(false);
  });
});

describe('building without working the darkness out', () => {
  it('works no sight out when it is turned off', () => {
    // Working it out even for a pass that only counts the pictures would work the sight out once per scene before the export starts.
    const snapshots = [table('t1', { darknessEnabled: true, darknessLevel: 0.9 }), selecter('t1')];
    const viewer = { userId: 'alice', role: PeerRole.Player };

    expect(buildReplayBoardScene(snapshots, viewer)?.overlay).not.toBeNull();
    expect(buildReplayBoardScene(snapshots, viewer, { withOverlay: false })?.overlay).toBeNull();
  });
});
