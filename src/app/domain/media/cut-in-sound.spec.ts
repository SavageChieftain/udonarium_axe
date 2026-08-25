import {
  type CutInSound,
  DEFAULT_SOUND_VOLUME,
  encodeCutInSounds,
  MAX_SOUNDS,
  moveSound,
  parseCutInSounds,
  removeSoundAt,
  soundIndexAt,
  soundsBetween,
  upsertSound,
} from '@axe/domain/media/cut-in-sound';

const sounds: CutInSound[] = [
  { t: 0, a: 'se-1', v: 100 },
  { t: 800, a: 'se-2', v: 60 },
];

describe('parseCutInSounds()', () => {
  it('reads nothing out of nothing', () => {
    expect(parseCutInSounds('')).toEqual([]);
    expect(parseCutInSounds(null)).toEqual([]);
  });

  it('reads nothing out of what is not JSON', () => {
    expect(parseCutInSounds('{oh dear')).toEqual([]);
  });

  it('reads nothing out of JSON that is not a list', () => {
    expect(parseCutInSounds('{"t":0}')).toEqual([]);
  });

  it('reads what was written', () => {
    expect(parseCutInSounds('[{"t":0,"a":"se-1","v":100},{"t":800,"a":"se-2","v":60}]')).toEqual(sounds);
  });

  it('leaves out an entry naming no sound or no moment', () => {
    expect(parseCutInSounds('[{"t":0},{"a":"se-1"},{"t":"soon","a":"se-2"}]')).toEqual([]);
  });

  it('falls back on full volume where none is given', () => {
    expect(parseCutInSounds('[{"t":0,"a":"se-1"}]')[0].v).toBe(DEFAULT_SOUND_VOLUME);
  });

  it('puts them in the order they play', () => {
    expect(parseCutInSounds('[{"t":800,"a":"b"},{"t":0,"a":"a"}]').map((sound) => sound.a)).toEqual(['a', 'b']);
  });
});

describe('encodeCutInSounds()', () => {
  it('writes nothing for a scene that stays quiet', () => {
    expect(encodeCutInSounds([])).toBe('');
  });

  it('writes what parsing reads back', () => {
    expect(parseCutInSounds(encodeCutInSounds(sounds))).toEqual(sounds);
  });
});

describe('upsertSound()', () => {
  it('drops the first sound onto an empty scene', () => {
    expect(upsertSound([], { t: 400, a: 'se-1', v: 80 })).toEqual([{ t: 400, a: 'se-1', v: 80 }]);
  });

  it('puts it in among the others in order', () => {
    expect(upsertSound(sounds, { t: 400, a: 'se-3', v: 50 }).map((sound) => sound.t)).toEqual([0, 400, 800]);
  });

  it('replaces whatever stood at that moment', () => {
    const written = upsertSound(sounds, { t: 800, a: 'se-9', v: 10 });

    expect(written).toHaveLength(2);
    expect(written[1].a).toBe('se-9');
  });

  it('holds the volume and the moment to what makes sense', () => {
    const written = upsertSound([], { t: -50, a: 'se-1', v: 900 });

    expect(written[0]).toEqual({ t: 0, a: 'se-1', v: 100 });
  });

  it('holds a scene to what it may carry', () => {
    let written: CutInSound[] = [];
    for (let at = 0; at < MAX_SOUNDS + 5; at++) written = upsertSound(written, { t: at * 100, a: 'se', v: 100 });

    expect(written).toHaveLength(MAX_SOUNDS);
  });
});

describe('soundIndexAt() and removeSoundAt()', () => {
  it('finds a sound sitting near a moment', () => {
    expect(soundIndexAt(sounds, 804)).toBe(1);
    expect(soundIndexAt(sounds, 400)).toBe(-1);
  });

  it('takes one away, and leaves the rest where no sound stands', () => {
    expect(removeSoundAt(sounds, 0)).toHaveLength(1);
    expect(removeSoundAt(sounds, 400)).toHaveLength(2);
  });
});

describe('moveSound()', () => {
  it('slides one along the clock, keeping what it plays', () => {
    const moved = moveSound(sounds, 0, 500);

    expect(moved.map((sound) => sound.t)).toEqual([500, 800]);
    expect(moved[0].a).toBe('se-1');
  });

  it('replaces what it lands on', () => {
    expect(moveSound(sounds, 0, 800)).toHaveLength(1);
  });

  it('leaves the scene alone where no sound stands', () => {
    expect(moveSound(sounds, 400, 900)).toEqual(sounds);
  });
});

describe('soundsBetween()', () => {
  it('finds what falls after one moment and up to another', () => {
    expect(soundsBetween(sounds, -1, 0).map((sound) => sound.a)).toEqual(['se-1']);
    expect(soundsBetween(sounds, 0, 800).map((sound) => sound.a)).toEqual(['se-2']);
  });

  it('finds nothing in a stretch with none in it', () => {
    expect(soundsBetween(sounds, 100, 700)).toEqual([]);
  });
});
