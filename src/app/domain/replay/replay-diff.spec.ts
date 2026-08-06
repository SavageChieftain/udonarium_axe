import {
  cloneSyncData,
  cloneSyncValue,
  diffSyncData,
  expandSyncPaths,
  flattenSyncData,
  hasChangedKey,
  isSameSyncValue,
  syncValueOf,
} from '@axe/domain/replay/replay-diff';

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

describe('flattenSyncData() / expandSyncPaths()', () => {
  const nested = {
    value: '',
    parentIdentifier: 'p1',
    attributes: { location: { name: 'table', x: 10, y: 0 }, posZ: 30, name: 'HP' },
  };
  const flat = {
    value: '',
    parentIdentifier: 'p1',
    'attributes.location': { name: 'table', x: 10, y: 0 },
    'attributes.posZ': 30,
    'attributes.name': 'HP',
  };

  it('属性を経路つきの平らな形にすること', () => {
    expect(flattenSyncData(nested)).toEqual(flat);
  });

  it('平らな形から元の入れ子に戻すこと', () => {
    expect(expandSyncPaths(flat)).toEqual(nested);
  });

  it('属性が無い形でも往復できること', () => {
    const plain = { userId: 'alice', peerId: 'p1' };
    expect(expandSyncPaths(flattenSyncData(plain))).toEqual(plain);
  });

  it('属性が入れ物でなければそのまま置くこと', () => {
    expect(flattenSyncData({ attributes: 'not-a-record' })).toEqual({ attributes: 'not-a-record' });
  });

  it('最上位と属性で同じ名前が衝突しないこと', () => {
    const collide = { value: '外', attributes: { value: '中' } };
    expect(flattenSyncData(collide)).toEqual({ value: '外', 'attributes.value': '中' });
    expect(expandSyncPaths(flattenSyncData(collide))).toEqual(collide);
  });
});

describe('syncValueOf() / hasChangedKey()', () => {
  const data = { value: '外', attributes: { posZ: 30, value: '中' } };

  it('属性を先に見ること', () => {
    expect(syncValueOf(data, 'posZ')).toBe(30);
    expect(syncValueOf(data, 'value')).toBe('中');
  });

  it('属性に無ければ最上位を見ること', () => {
    expect(syncValueOf({ value: '外' }, 'value')).toBe('外');
    expect(syncValueOf(data, 'unknown')).toBeUndefined();
  });

  it('経路つきの名前でも変化を見つけること', () => {
    expect(hasChangedKey(new Set(['attributes.location']), 'location')).toBe(true);
    expect(hasChangedKey(new Set(['value']), 'value')).toBe(true);
    expect(hasChangedKey(new Set(['attributes.posZ']), 'location')).toBe(false);
  });
});

describe('cloneSyncValue()', () => {
  it('プリミティブはそのまま返すこと', () => {
    expect(cloneSyncValue(1)).toBe(1);
    expect(cloneSyncValue('a')).toBe('a');
    expect(cloneSyncValue(true)).toBe(true);
    expect(cloneSyncValue(null)).toBeNull();
    expect(cloneSyncValue(undefined)).toBeUndefined();
  });

  it('入れ子の配列とオブジェクトを複製すること', () => {
    const source = { rows: [{ x: 1 }, { x: 2 }] };
    const copy = cloneSyncValue(source);
    expect(copy).toEqual(source);
    source.rows[0].x = 99;
    expect(copy.rows[0].x).toBe(1);
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
