import {
  diffResourceSnapshots,
  loudestChangeRatio,
  resourceChangeSeverity,
  ResourceSnapshot,
} from '@axe/domain/character/resource-change';

describe('diffResourceSnapshots()', () => {
  const nameOf = (identifier: string) => identifier.toUpperCase();

  /** The usual case is a change made at this end; values arriving by load or sync are checked elsewhere. */
  function snapshot(entries: Record<string, ResourceSnapshot>, changedBySelf = 0): Map<string, ResourceSnapshot> {
    return new Map(Object.entries(entries).map(([key, value]) => [key, { changedBySelf, ...value }]));
  }

  function before(entries: Record<string, ResourceSnapshot>): Map<string, ResourceSnapshot> {
    return snapshot(entries, 0);
  }

  function after(entries: Record<string, ResourceSnapshot>): Map<string, ResourceSnapshot> {
    return snapshot(entries, 1);
  }

  it('returns a fall in the current value as damage', () => {
    const from = before({ hp: { current: 200, max: 200 } });
    const to = after({ hp: { current: 170, max: 200 } });

    expect(diffResourceSnapshots(from, to, nameOf)).toEqual([
      {
        identifier: 'hp',
        name: 'HP',
        kind: 'damage',
        delta: -30,
        label: '-30',
        ratio: 0.15,
        playsEffect: false,
        playsSound: false,
        soundSet: 'flesh',
      },
    ]);
  });

  it('carries the sound the resource asked for', () => {
    const from = before({ hp: { current: 200, max: 200, soundSet: 'mech' } });
    const to = after({ hp: { current: 170, max: 200, soundSet: 'mech' } });

    expect(diffResourceSnapshots(from, to, nameOf)).toEqual([expect.objectContaining({ soundSet: 'mech' })]);
  });

  it('returns a rise as healing', () => {
    const from = before({ hp: { current: 100, max: 200 } });
    const to = after({ hp: { current: 150, max: 200 } });

    expect(diffResourceSnapshots(from, to, nameOf)[0]).toMatchObject({ kind: 'heal', delta: 50, label: '+50' });
  });

  it('treats a change of maximum the same way', () => {
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

  it('adds them together when both move at once', () => {
    const from = before({ hp: { current: 100, max: 200 } });
    const to = after({ hp: { current: 90, max: 190 } });

    expect(diffResourceSnapshots(from, to, nameOf)[0].label).toBe('-20');
  });

  it('reverses the meaning on a resource that runs the other way', () => {
    const from = before({ san: { current: 10, max: 100, inverted: true } });

    expect(
      diffResourceSnapshots(from, after({ san: { current: 40, max: 100, inverted: true } }), nameOf)[0]
    ).toMatchObject({ kind: 'damage', label: '+30' });
    expect(
      diffResourceSnapshots(from, after({ san: { current: 4, max: 100, inverted: true } }), nameOf)[0]
    ).toMatchObject({ kind: 'heal', label: '-6' });
  });

  it('returns nothing when nothing changed', () => {
    const same = snapshot({ hp: { current: 100, max: 200 }, mp: { current: 10, max: 10 } });

    expect(
      diffResourceSnapshots(same, snapshot({ hp: { current: 100, max: 200 }, mp: { current: 10, max: 10 } }), nameOf)
    ).toEqual([]);
  });

  it('counts a newly appearing field as no change', () => {
    expect(diffResourceSnapshots(new Map(), snapshot({ hp: { current: 100, max: 200 } }), nameOf)).toEqual([]);
  });
  it('counts a value replaced by something other than you as no change', () => {
    // Loading a room replaces every value at once, and the difference alone cannot be told
    // from a real change, so the load would fire a healing sound and a number for everybody.
    const from = snapshot({ hp: { current: 200, max: 200 } }, 3);
    const to = snapshot({ hp: { current: 999, max: 999 } }, 3);

    expect(diffResourceSnapshots(from, to, nameOf)).toEqual([]);
  });

  it('picks up what you changed', () => {
    const from = snapshot({ hp: { current: 200, max: 200 } }, 3);
    const to = snapshot({ hp: { current: 170, max: 200 } }, 4);

    expect(diffResourceSnapshots(from, to, nameOf)[0]).toMatchObject({ kind: 'damage', label: '-30' });
  });

  it('answers a change only the way the field asks to be answered', () => {
    const quiet = diffResourceSnapshots(
      before({ hp: { current: 200, max: 200 } }),
      after({ hp: { current: 190, max: 200 } }),
      nameOf
    );
    expect(quiet[0]).toMatchObject({ playsEffect: false, playsSound: false });

    const asked = diffResourceSnapshots(
      before({ hp: { current: 200, max: 200, playsEffect: true, playsSound: true } }),
      after({ hp: { current: 190, max: 200, playsEffect: true, playsSound: true } }),
      nameOf
    );
    expect(asked[0]).toMatchObject({ playsEffect: true, playsSound: true });
  });
});

describe('resourceChangeSeverity()', () => {
  it('sorts the change into three sizes by its share of the maximum', () => {
    expect(resourceChangeSeverity(0.05)).toBe('small');
    expect(resourceChangeSeverity(0.14)).toBe('small');
    expect(resourceChangeSeverity(0.15)).toBe('medium');
    expect(resourceChangeSeverity(0.39)).toBe('medium');
    expect(resourceChangeSeverity(0.4)).toBe('large');
    expect(resourceChangeSeverity(3)).toBe('large');
  });

  it('calls it middling when the share cannot be worked out', () => {
    expect(resourceChangeSeverity(0)).toBe('medium');
    expect(resourceChangeSeverity(Number.NaN)).toBe('medium');
  });
});

describe('loudestChangeRatio()', () => {
  it('returns the largest share', () => {
    const changes = [
      {
        identifier: 'a',
        name: 'HP',
        kind: 'damage' as const,
        delta: -10,
        label: '-10',
        ratio: 0.05,
        playsEffect: true,
        playsSound: false,
        soundSet: 'flesh' as const,
      },
      {
        identifier: 'b',
        name: 'MP',
        kind: 'damage' as const,
        delta: -20,
        label: '-20',
        ratio: 0.5,
        playsEffect: true,
        playsSound: false,
        soundSet: 'flesh' as const,
      },
    ];

    expect(loudestChangeRatio(changes)).toBe(0.5);
  });

  it('returns nothing when nothing changed', () => {
    expect(loudestChangeRatio([])).toBe(0);
  });
});
