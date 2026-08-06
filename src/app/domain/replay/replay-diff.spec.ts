import { cloneSyncData, diffSyncData, isSameSyncValue } from '@axe/domain/replay/replay-diff';

describe('isSameSyncValue()', () => {
  it('プリミティブを値で比べること', () => {
    expect(isSameSyncValue(1, 1)).toBe(true);
    expect(isSameSyncValue('a', 'a')).toBe(true);
    expect(isSameSyncValue(1, '1')).toBe(false);
    expect(isSameSyncValue(null, undefined)).toBe(false);
  });

  it('入れ子のオブジェクトを再帰的に比べること', () => {
    expect(isSameSyncValue({ x: 1, y: { z: 2 } }, { x: 1, y: { z: 2 } })).toBe(true);
    expect(isSameSyncValue({ x: 1, y: { z: 2 } }, { x: 1, y: { z: 3 } })).toBe(false);
  });

  it('キー数が違うオブジェクトを別物とすること', () => {
    expect(isSameSyncValue({ x: 1 }, { x: 1, y: 2 })).toBe(false);
  });

  it('配列を順序込みで比べること', () => {
    expect(isSameSyncValue([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isSameSyncValue([1, 2, 3], [3, 2, 1])).toBe(false);
    expect(isSameSyncValue([1, 2], [1, 2, 3])).toBe(false);
  });

  it('配列とオブジェクトを別物とすること', () => {
    expect(isSameSyncValue([], {})).toBe(false);
  });
});

describe('diffSyncData()', () => {
  it('変化が無ければ null を返すこと', () => {
    const data = { name: '盗賊', location: { name: 'table', x: 10, y: 20 } };
    expect(diffSyncData(data, structuredClone(data))).toBeNull();
  });

  it('変わったキーだけを前後で返すこと', () => {
    const before = { name: '盗賊', posZ: 0, rotate: 0 };
    const after = { name: '盗賊', posZ: 30, rotate: 0 };
    expect(diffSyncData(before, after)).toEqual({
      keys: ['posZ'],
      before: { posZ: 0 },
      after: { posZ: 30 },
    });
  });

  it('入れ子の座標の変化を拾うこと', () => {
    const before = { location: { name: 'table', x: 0, y: 0 } };
    const after = { location: { name: 'table', x: 100, y: 50 } };
    const diff = diffSyncData(before, after);
    expect(diff?.keys).toEqual(['location']);
    expect(diff?.before['location']).toEqual({ name: 'table', x: 0, y: 0 });
    expect(diff?.after['location']).toEqual({ name: 'table', x: 100, y: 50 });
  });

  it('before が無ければ全キーを新規として返すこと', () => {
    const diff = diffSyncData(null, { name: '盗賊', posZ: 0 });
    expect(diff?.keys).toEqual(['name', 'posZ']);
    expect(diff?.before).toEqual({});
    expect(diff?.after).toEqual({ name: '盗賊', posZ: 0 });
  });

  it('消えたキーも差分として返すこと', () => {
    const diff = diffSyncData({ owner: 'alice', posZ: 0 }, { posZ: 0 });
    expect(diff?.keys).toEqual(['owner']);
    expect(diff?.before).toEqual({ owner: 'alice' });
    expect(diff?.after).toEqual({});
  });

  it('返す値が元データと参照を共有しないこと', () => {
    const before = { location: { name: 'table', x: 0, y: 0 } };
    const after = { location: { name: 'table', x: 5, y: 0 } };
    const diff = diffSyncData(before, after)!;
    (after.location as { x: number }).x = 999;
    expect(diff.after['location']).toEqual({ name: 'table', x: 5, y: 0 });
  });
});

describe('cloneSyncData()', () => {
  it('深いコピーを返すこと', () => {
    const source = { location: { x: 1, y: 2 }, tags: ['a'] };
    const copy = cloneSyncData(source);
    expect(copy).toEqual(source);
    source.location.x = 99;
    source.tags.push('b');
    expect(copy['location']).toEqual({ x: 1, y: 2 });
    expect(copy['tags']).toEqual(['a']);
  });
});
