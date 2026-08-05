import {
  diffResourceSnapshots,
  loudestChangeRatio,
  resourceChangeSeverity,
  ResourceSnapshot,
} from '@axe/domain/character/resource-change';

describe('diffResourceSnapshots()', () => {
  const nameOf = (identifier: string) => identifier.toUpperCase();

  function snapshot(entries: Record<string, ResourceSnapshot>): Map<string, ResourceSnapshot> {
    return new Map(Object.entries(entries));
  }

  it('現在値が減ればダメージとして返すこと', () => {
    const before = snapshot({ hp: { current: 200, max: 200 } });
    const after = snapshot({ hp: { current: 170, max: 200 } });

    expect(diffResourceSnapshots(before, after, nameOf)).toEqual([
      { identifier: 'hp', name: 'HP', kind: 'damage', delta: -30, label: '-30', ratio: 0.15 },
    ]);
  });

  it('現在値が増えれば回復として返すこと', () => {
    const before = snapshot({ hp: { current: 100, max: 200 } });
    const after = snapshot({ hp: { current: 150, max: 200 } });

    expect(diffResourceSnapshots(before, after, nameOf)[0]).toMatchObject({ kind: 'heal', delta: 50, label: '+50' });
  });

  it('最大値の増減も同じ扱いにすること', () => {
    const before = snapshot({ hp: { current: 100, max: 200 } });

    expect(diffResourceSnapshots(before, snapshot({ hp: { current: 100, max: 180 } }), nameOf)[0]).toMatchObject({
      kind: 'damage',
      label: '-20',
    });
    expect(diffResourceSnapshots(before, snapshot({ hp: { current: 100, max: 260 } }), nameOf)[0]).toMatchObject({
      kind: 'heal',
      label: '+60',
    });
  });

  it('現在値と最大値が同時に動けば合算すること', () => {
    const before = snapshot({ hp: { current: 100, max: 200 } });
    const after = snapshot({ hp: { current: 90, max: 190 } });

    expect(diffResourceSnapshots(before, after, nameOf)[0].label).toBe('-20');
  });

  it('マイナスリソースでは増減の意味を裏返すこと', () => {
    const before = snapshot({ san: { current: 10, max: 100, inverted: true } });

    expect(
      diffResourceSnapshots(before, snapshot({ san: { current: 40, max: 100, inverted: true } }), nameOf)[0]
    ).toMatchObject({ kind: 'damage', label: '+30' });
    expect(
      diffResourceSnapshots(before, snapshot({ san: { current: 4, max: 100, inverted: true } }), nameOf)[0]
    ).toMatchObject({ kind: 'heal', label: '-6' });
  });

  it('変化が無ければ何も返さないこと', () => {
    const same = snapshot({ hp: { current: 100, max: 200 }, mp: { current: 10, max: 10 } });

    expect(
      diffResourceSnapshots(same, snapshot({ hp: { current: 100, max: 200 }, mp: { current: 10, max: 10 } }), nameOf)
    ).toEqual([]);
  });

  it('新しく現れた項目は変化として扱わないこと', () => {
    expect(diffResourceSnapshots(new Map(), snapshot({ hp: { current: 100, max: 200 } }), nameOf)).toEqual([]);
  });
});

describe('resourceChangeSeverity()', () => {
  it('最大値に対する割合で 3 段階に分けること', () => {
    expect(resourceChangeSeverity(0.05)).toBe('small');
    expect(resourceChangeSeverity(0.14)).toBe('small');
    expect(resourceChangeSeverity(0.15)).toBe('medium');
    expect(resourceChangeSeverity(0.39)).toBe('medium');
    expect(resourceChangeSeverity(0.4)).toBe('large');
    expect(resourceChangeSeverity(3)).toBe('large');
  });

  it('割合が分からないものは中位にすること', () => {
    expect(resourceChangeSeverity(0)).toBe('medium');
    expect(resourceChangeSeverity(Number.NaN)).toBe('medium');
  });
});

describe('loudestChangeRatio()', () => {
  it('もっとも大きな割合を返すこと', () => {
    const changes = [
      { identifier: 'a', name: 'HP', kind: 'damage' as const, delta: -10, label: '-10', ratio: 0.05 },
      { identifier: 'b', name: 'MP', kind: 'damage' as const, delta: -20, label: '-20', ratio: 0.5 },
    ];

    expect(loudestChangeRatio(changes)).toBe(0.5);
  });

  it('変化が無ければ 0 を返すこと', () => {
    expect(loudestChangeRatio([])).toBe(0);
  });

  it('値が入っていなかったところへ入っただけなら増減としないこと', () => {
    // 部屋データを読み込むと要素が段階的に組み上がる。これを増減と見ると
    // 全員ぶんの回復音が一斉に鳴ってしまう。
    const before = new Map([['HP', { current: 0, max: 0 }]]);
    const after = new Map([['HP', { current: 200, max: 200 }]]);

    expect(diffResourceSnapshots(before, after, () => 'HP')).toEqual([]);
  });

  it('最大値が入ったあとの増減は拾うこと', () => {
    const before = new Map([['HP', { current: 200, max: 200 }]]);
    const after = new Map([['HP', { current: 170, max: 200 }]]);

    expect(diffResourceSnapshots(before, after, () => 'HP')).toEqual([
      expect.objectContaining({ kind: 'damage', delta: -30 }),
    ]);
  });
});
