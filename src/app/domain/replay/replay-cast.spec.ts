import { collectReplayCast, replayCastOnTable } from '@axe/domain/replay/replay-cast';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';

function character(identifier: string, colors: string[] = ['#112233']): ReplayObjectSnapshot {
  return {
    identifier,
    aliasName: 'character',
    syncData: { value: '', attributes: { chatColorCode: colors, location: { name: 'table', x: 0, y: 0 } } },
  };
}

function data(identifier: string, parent: string, name: string, value: string = ''): ReplayObjectSnapshot {
  return {
    identifier,
    aliasName: 'data',
    syncData: { value, attributes: { name }, parentIdentifier: parent },
  };
}

function characterTree(identifier: string, name: string, image: string): ReplayObjectSnapshot[] {
  return [
    character(identifier),
    data(`${identifier}-root`, identifier, 'character'),
    data(`${identifier}-common`, `${identifier}-root`, 'common'),
    data(`${identifier}-name`, `${identifier}-common`, 'name', name),
    data(`${identifier}-image`, `${identifier}-root`, 'image'),
    data(`${identifier}-img-id`, `${identifier}-image`, 'imageIdentifier', image),
  ];
}

describe('collectReplayCast()', () => {
  it('盤面のコマを名前と立ち絵つきで集めること', () => {
    const cast = collectReplayCast([
      ...characterTree('c1', '盗賊', 'img-1'),
      ...characterTree('c2', '魔術師', 'img-2'),
    ]);

    expect(cast).toEqual([
      { identifier: 'c1', name: '盗賊', imageIdentifier: 'img-1', chatColor: '#112233', onTable: true },
      { identifier: 'c2', name: '魔術師', imageIdentifier: 'img-2', chatColor: '#112233', onTable: true },
    ]);
  });

  it('イベントに出てこないコマも拾うこと', () => {
    const cast = collectReplayCast([...characterTree('quiet', '沈黙の人', '')]);
    expect(cast.map((member) => member.name)).toEqual(['沈黙の人']);
  });

  it('コマ以外を混ぜないこと', () => {
    const snapshots: ReplayObjectSnapshot[] = [
      ...characterTree('c1', '盗賊', 'img-1'),
      { identifier: 'k1', aliasName: 'card', syncData: { attributes: {} } },
      { identifier: 't1', aliasName: 'table-mask', syncData: { attributes: {} } },
    ];
    expect(collectReplayCast(snapshots).map((member) => member.identifier)).toEqual(['c1']);
  });

  it('名前や立ち絵が無くても落ちないこと', () => {
    const cast = collectReplayCast([character('bare')]);
    expect(cast).toEqual([{ identifier: 'bare', name: '', imageIdentifier: '', chatColor: '#112233', onTable: true }]);
  });

  it('しまってあるコマを盤の上と区別すること', () => {
    const stored: ReplayObjectSnapshot = {
      identifier: 'kept',
      aliasName: 'character',
      syncData: { value: '', attributes: { chatColorCode: ['#112233'], location: { name: 'inventory', x: 0, y: 0 } } },
    };

    expect(collectReplayCast([stored])[0].onTable).toBe(false);
    expect(collectReplayCast([character('c1')])[0].onTable).toBe(true);
  });

  it('色が無ければ空にすること', () => {
    expect(collectReplayCast([character('c1', [])])[0].chatColor).toBe('');
  });

  it('同じ名前の要素が他の節にもあるとき共通欄を選ぶこと', () => {
    const snapshots: ReplayObjectSnapshot[] = [
      ...characterTree('c1', '盗賊', 'img-1'),
      data('c1-detail', 'c1-root', 'detail'),
      data('c1-detail-name', 'c1-detail', 'name', '別の名前'),
    ];
    expect(collectReplayCast(snapshots)[0].name).toBe('盗賊');
  });

  it('空の盤面では空を返すこと', () => {
    expect(collectReplayCast([])).toEqual([]);
  });
});

describe('replayCastOnTable()', () => {
  const on = { identifier: 'a', name: 'アリス', imageIdentifier: '', chatColor: '', onTable: true };
  const off = { identifier: 'b', name: 'ボブ', imageIdentifier: '', chatColor: '', onTable: false };

  it('盤に出ていたコマだけを残すこと', () => {
    expect(replayCastOnTable([on, off])).toEqual([on]);
  });

  it('盤に 1 つも出ていなければ、全員を返すこと', () => {
    expect(replayCastOnTable([off])).toEqual([off]);
  });
});
