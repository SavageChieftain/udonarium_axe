import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { normalizeRect, selectByRect } from '@axe/application/ui/rect-hit-test';
import { makeFakeTabletopObject } from '@axe/testing/factories/tabletop-object.factory';

function makeObject(opts: {
  id: string;
  alias: string;
  x: number;
  y: number;
  size?: number;
  width?: number;
  height?: number;
  location?: string;
}): TabletopObject {
  return makeFakeTabletopObject({
    identifier: opts.id,
    aliasName: opts.alias,
    x: opts.x,
    y: opts.y,
    size: opts.size,
    width: opts.width,
    height: opts.height,
    locationName: opts.location,
  });
}

describe('normalizeRect', () => {
  it('反転した矩形を min/max 正規化する', () => {
    expect(normalizeRect({ x1: 100, y1: 50, x2: 10, y2: 80 })).toEqual({ x1: 10, y1: 50, x2: 100, y2: 80 });
  });
});

describe('selectByRect', () => {
  it('rect 内に中心がある table 上のオブジェクトを返す', () => {
    const objects: TabletopObject[] = [
      makeObject({ id: 'a', alias: 'character', x: 0, y: 0, size: 1 }),
      makeObject({ id: 'b', alias: 'character', x: 200, y: 200, size: 1 }),
    ];
    const hits = selectByRect(objects, { x1: 0, y1: 0, x2: 100, y2: 100 });
    expect(hits).toEqual(['a']);
  });

  it('graveyard など table 以外のオブジェクトは除外する', () => {
    const objects: TabletopObject[] = [
      makeObject({ id: 'a', alias: 'character', x: 0, y: 0, size: 1, location: 'graveyard' }),
    ];
    expect(selectByRect(objects, { x1: -100, y1: -100, x2: 100, y2: 100 })).toEqual([]);
  });

  it('デフォルトで range は除外される', () => {
    const objects: TabletopObject[] = [
      makeObject({ id: 'a', alias: 'range', x: 0, y: 0, size: 1 }),
      makeObject({ id: 'b', alias: 'character', x: 0, y: 0, size: 1 }),
    ];
    expect(selectByRect(objects, { x1: -100, y1: -100, x2: 100, y2: 100 })).toEqual(['b']);
  });

  it('オプションで除外 alias を上書きできる', () => {
    const objects: TabletopObject[] = [
      makeObject({ id: 'a', alias: 'character', x: 0, y: 0, size: 1 }),
      makeObject({ id: 'b', alias: 'terrain', x: 0, y: 0, width: 1, height: 1 }),
    ];
    const hits = selectByRect(objects, { x1: -100, y1: -100, x2: 100, y2: 100 }, { excludeAliases: ['character'] });
    expect(hits).toEqual(['b']);
  });

  it('width/height を持つオブジェクトの中心で判定する', () => {
    const objects: TabletopObject[] = [makeObject({ id: 'a', alias: 'terrain', x: 0, y: 0, width: 2, height: 4 })];
    // 中心 = (0 + 2*50/2, 0 + 4*50/2) = (50, 100)
    expect(selectByRect(objects, { x1: 40, y1: 90, x2: 60, y2: 110 })).toEqual(['a']);
    expect(selectByRect(objects, { x1: 0, y1: 0, x2: 40, y2: 40 })).toEqual([]);
  });

  it('rect を逆順で渡しても正しく判定する', () => {
    const objects: TabletopObject[] = [makeObject({ id: 'a', alias: 'character', x: 0, y: 0, size: 1 })];
    expect(selectByRect(objects, { x1: 100, y1: 100, x2: -100, y2: -100 })).toEqual(['a']);
  });
});
