import {
  diffResourceSnapshots,
  loudestChangeRatio,
  resourceChangeSeverity,
  ResourceSnapshot,
} from '@axe/domain/character/resource-change';

describe('diffResourceSnapshots()', () => {
  const nameOf = (identifier: string) => identifier.toUpperCase();

  /** 既定は「この端末が変えた直後」。読み込みや同期で入った値は別のテストで確かめる。 */
  function snapshot(entries: Record<string, ResourceSnapshot>, changedBySelf = 0): Map<string, ResourceSnapshot> {
    return new Map(Object.entries(entries).map(([key, value]) => [key, { changedBySelf, ...value }]));
  }

  function before(entries: Record<string, ResourceSnapshot>): Map<string, ResourceSnapshot> {
    return snapshot(entries, 0);
  }

  function after(entries: Record<string, ResourceSnapshot>): Map<string, ResourceSnapshot> {
    return snapshot(entries, 1);
  }

  it('現在値が減ればダメージとして返すこと', () => {
    const from = before({ hp: { current: 200, max: 200 } });
    const to = after({ hp: { current: 170, max: 200 } });

    expect(diffResourceSnapshots(from, to, nameOf)).toEqual([
      { identifier: 'hp', name: 'HP', kind: 'damage', delta: -30, label: '-30', ratio: 0.15 },
    ]);
  });

  it('現在値が増えれば回復として返すこと', () => {
    const from = before({ hp: { current: 100, max: 200 } });
    const to = after({ hp: { current: 150, max: 200 } });

    expect(diffResourceSnapshots(from, to, nameOf)[0]).toMatchObject({ kind: 'heal', delta: 50, label: '+50' });
  });

  it('最大値の増減も同じ扱いにすること', () => {
    const from = before({ hp: { current: 100, max: 200 } });

    expect(diffResourceSnapshots(from, after({ hp: { current: 100, max: 180 } }), nameOf)[0]).toMatchObject({
      kind: 'damage',
      label: '-20',
    });
    expect(diffResourceSnapshots(from, after({ hp: { current: 100, max: 260 } }), nameOf)[0]).toMatchObject({
      kind: 'heal',
      label: '+60',
    });
  });

  it('現在値と最大値が同時に動けば合算すること', () => {
    const from = before({ hp: { current: 100, max: 200 } });
    const to = after({ hp: { current: 90, max: 190 } });

    expect(diffResourceSnapshots(from, to, nameOf)[0].label).toBe('-20');
  });

  it('マイナスリソースでは増減の意味を裏返すこと', () => {
    const from = before({ san: { current: 10, max: 100, inverted: true } });

    expect(
      diffResourceSnapshots(from, after({ san: { current: 40, max: 100, inverted: true } }), nameOf)[0]
    ).toMatchObject({ kind: 'damage', label: '+30' });
    expect(
      diffResourceSnapshots(from, after({ san: { current: 4, max: 100, inverted: true } }), nameOf)[0]
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
  it('自分が変えていない入れ替わりは増減としないこと', () => {
    // 部屋を読み込むと値は丸ごと入れ替わる。差分だけを見ると本物の増減と区別が付かず、
    // 読み込んだ瞬間に全員ぶんの回復音と数字が飛び出す。
    const from = snapshot({ hp: { current: 200, max: 200 } }, 3);
    const to = snapshot({ hp: { current: 999, max: 999 } }, 3);

    expect(diffResourceSnapshots(from, to, nameOf)).toEqual([]);
  });

  it('自分が変えたぶんは拾うこと', () => {
    const from = snapshot({ hp: { current: 200, max: 200 } }, 3);
    const to = snapshot({ hp: { current: 170, max: 200 } }, 4);

    expect(diffResourceSnapshots(from, to, nameOf)[0]).toMatchObject({ kind: 'damage', label: '-30' });
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
});
