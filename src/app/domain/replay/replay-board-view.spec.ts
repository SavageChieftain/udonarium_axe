import { buildReplayBoardScene, collectBoardAssetIds } from '@axe/domain/replay/replay-board-view';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';

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
