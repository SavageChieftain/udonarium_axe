import {
  CUT_IN_TRACKS,
  type CutInKey,
  encodeCutInTracks,
  isCutInTrack,
  keyIndexAt,
  keyTimes,
  lastKeyTime,
  MAX_KEYS_PER_TRACK,
  moveKey,
  parseCutInTracks,
  removeKeyAt,
  sampleTrack,
  surroundingKeys,
  upsertKey,
} from '@axe/domain/media/cut-in-keyframe';

const slide: CutInKey[] = [
  { t: 0, v: -400, e: 'linear' },
  { t: 600, v: 0 },
];

describe('isCutInTrack()', () => {
  it('knows the tracks a layer has', () => {
    for (const name of CUT_IN_TRACKS) expect(isCutInTrack(name)).toBe(true);
  });

  it('turns away anything else', () => {
    expect(isCutInTrack('colour')).toBe(false);
    expect(isCutInTrack(null)).toBe(false);
  });
});

describe('parseCutInTracks()', () => {
  it('reads nothing out of nothing', () => {
    expect(parseCutInTracks('')).toEqual({});
    expect(parseCutInTracks(null)).toEqual({});
    expect(parseCutInTracks(undefined)).toEqual({});
  });

  it('reads nothing out of what is not JSON', () => {
    expect(parseCutInTracks('{oh dear')).toEqual({});
  });

  it('reads nothing out of JSON that is not an object', () => {
    expect(parseCutInTracks('[1, 2]')).toEqual({});
    expect(parseCutInTracks('7')).toEqual({});
  });

  it('reads the tracks it knows', () => {
    const tracks = parseCutInTracks('{"x":[{"t":0,"v":-400,"e":"linear"},{"t":600,"v":0}]}');

    expect(tracks.x).toEqual(slide);
  });

  it('leaves out the tracks it does not know', () => {
    const tracks = parseCutInTracks('{"colour":[{"t":0,"v":1}],"opacity":[{"t":0,"v":1}]}');

    expect(Object.keys(tracks)).toEqual(['opacity']);
  });

  it('leaves out the keys that name no moment or no value', () => {
    const tracks = parseCutInTracks('{"x":[{"t":0,"v":1},{"v":2},{"t":"soon","v":3}]}');

    expect(tracks.x).toEqual([{ t: 0, v: 1 }]);
  });

  it('puts the keys in order of when they happen', () => {
    const tracks = parseCutInTracks('{"x":[{"t":600,"v":0},{"t":0,"v":-400}]}');

    expect(tracks.x?.map((key) => key.t)).toEqual([0, 600]);
  });

  it('drops a track once every key in it is unreadable', () => {
    expect(parseCutInTracks('{"x":[{"v":1}]}')).toEqual({});
  });
});

describe('encodeCutInTracks()', () => {
  it('writes nothing for a layer that does not move', () => {
    expect(encodeCutInTracks({})).toBe('');
    expect(encodeCutInTracks({ x: [] })).toBe('');
  });

  it('writes what parsing reads back', () => {
    const raw = encodeCutInTracks({ x: slide });

    expect(parseCutInTracks(raw).x).toEqual(slide);
  });

  it('keeps to the tracks a layer has', () => {
    const raw = encodeCutInTracks({ x: slide, colour: slide } as never);

    expect(raw).not.toContain('colour');
  });
});

describe('surroundingKeys()', () => {
  it('finds neither on an empty track', () => {
    expect(surroundingKeys([], 100)).toEqual({ prev: null, next: null });
    expect(surroundingKeys(undefined, 100)).toEqual({ prev: null, next: null });
  });

  it('finds only what is ahead before the first key', () => {
    expect(surroundingKeys([{ t: 200, v: 1 }], 0)).toEqual({ prev: null, next: { t: 200, v: 1 } });
  });

  it('finds only what is behind after the last key', () => {
    expect(surroundingKeys([{ t: 200, v: 1 }], 900)).toEqual({ prev: { t: 200, v: 1 }, next: null });
  });

  it('finds both in between', () => {
    const found = surroundingKeys(slide, 300);

    expect(found.prev?.t).toBe(0);
    expect(found.next?.t).toBe(600);
  });

  it('counts a key sitting exactly on the moment as behind', () => {
    const found = surroundingKeys(slide, 600);

    expect(found.prev?.t).toBe(600);
    expect(found.next).toBeNull();
  });
});

describe('sampleTrack()', () => {
  it('falls back where there is no track', () => {
    expect(sampleTrack(undefined, 100, 42)).toBe(42);
    expect(sampleTrack([], 100, 42)).toBe(42);
  });

  it('holds the first value before the first key', () => {
    expect(sampleTrack(slide, -100, 0)).toBe(-400);
  });

  it('holds the last value after the last key', () => {
    expect(sampleTrack(slide, 5000, 0)).toBe(0);
  });

  it('eases between two keys', () => {
    expect(sampleTrack(slide, 300, 0)).toBeCloseTo(-200, 5);
  });

  it('eases along the curve the key it leaves names', () => {
    const eased: CutInKey[] = [
      { t: 0, v: 0, e: 'outCubic' },
      { t: 1000, v: 100 },
    ];

    expect(sampleTrack(eased, 500, 0)).toBeGreaterThan(50);
  });

  it('takes the later value where two keys share a moment', () => {
    expect(
      sampleTrack(
        [
          { t: 0, v: 1 },
          { t: 0, v: 9 },
        ],
        0,
        0
      )
    ).toBe(9);
  });
});

describe('keyIndexAt()', () => {
  it('finds a key sitting on the moment', () => {
    expect(keyIndexAt(slide, 600)).toBe(1);
  });

  it('finds a key sitting near enough to it', () => {
    expect(keyIndexAt(slide, 604)).toBe(1);
  });

  it('finds nothing where no key stands', () => {
    expect(keyIndexAt(slide, 300)).toBe(-1);
    expect(keyIndexAt(undefined, 300)).toBe(-1);
  });
});

describe('upsertKey()', () => {
  it('lays the first key on an empty track', () => {
    expect(upsertKey(undefined, { t: 100, v: 5 })).toEqual([{ t: 100, v: 5 }]);
  });

  it('puts the new key in among the others in order', () => {
    const keys = upsertKey(slide, { t: 300, v: -200 });

    expect(keys.map((key) => key.t)).toEqual([0, 300, 600]);
  });

  it('replaces what already stood at that moment', () => {
    const keys = upsertKey(slide, { t: 600, v: 999 });

    expect(keys).toHaveLength(2);
    expect(keys[1].v).toBe(999);
  });

  it('rounds the moment and keeps it off the negative side', () => {
    expect(upsertKey([], { t: -50.6, v: 1 })[0].t).toBe(0);
    expect(upsertKey([], { t: 120.4, v: 1 })[0].t).toBe(120);
  });

  it('leaves the default curve unwritten', () => {
    expect(upsertKey([], { t: 0, v: 1, e: 'outCubic' })[0].e).toBeUndefined();
    expect(upsertKey([], { t: 0, v: 1, e: 'linear' })[0].e).toBe('linear');
  });

  it('holds a track to what it may carry', () => {
    let keys: CutInKey[] = [];
    for (let at = 0; at < MAX_KEYS_PER_TRACK + 10; at++) keys = upsertKey(keys, { t: at * 100, v: at });

    expect(keys).toHaveLength(MAX_KEYS_PER_TRACK);
  });
});

describe('removeKeyAt()', () => {
  it('takes the key at that moment away', () => {
    expect(removeKeyAt(slide, 0).map((key) => key.t)).toEqual([600]);
  });

  it('leaves the track alone where no key stands', () => {
    expect(removeKeyAt(slide, 300)).toHaveLength(2);
  });
});

describe('moveKey()', () => {
  it('slides a key along the clock', () => {
    expect(moveKey(slide, 600, 900).map((key) => key.t)).toEqual([0, 900]);
  });

  it('keeps the value and the curve it slid with', () => {
    const moved = moveKey(slide, 0, 200);

    expect(moved[0]).toEqual({ t: 200, v: -400, e: 'linear' });
  });

  it('replaces what it lands on', () => {
    expect(moveKey(slide, 0, 600)).toHaveLength(1);
  });

  it('leaves the track alone where no key stands', () => {
    expect(moveKey(slide, 300, 900)).toEqual(slide);
  });
});

describe('keyTimes() and lastKeyTime()', () => {
  it('gathers every moment, once each and in order', () => {
    expect(
      keyTimes({
        x: slide,
        opacity: [
          { t: 300, v: 1 },
          { t: 600, v: 0 },
        ],
      })
    ).toEqual([0, 300, 600]);
  });

  it('finds nothing on a layer that does not move', () => {
    expect(keyTimes({})).toEqual([]);
    expect(lastKeyTime({})).toBe(0);
  });

  it('finds the last moment across every track', () => {
    expect(lastKeyTime({ x: slide, blur: [{ t: 2000, v: 4 }] })).toBe(2000);
  });
});
