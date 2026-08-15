import {
  ambienceColorOf,
  ambienceDensityOf,
  ambienceKindOf,
  ambiencePalette,
  GROUND_AMBIENCE_KINDS,
  isAmbienceKind,
  SKY_AMBIENCE_KINDS,
} from '@axe/domain/effect/ambience/ambience-kind';

describe('ambienceKindOf()', () => {
  it('falls back to the default for a value it does not know', () => {
    expect(ambienceKindOf('swamp')).toBe('swamp');
    expect(ambienceKindOf('unknown')).toBe('fog');
    expect(ambienceKindOf(undefined, 'lava')).toBe('lava');
  });
});

describe('isAmbienceKind()', () => {
  it('turns away anything that is not text', () => {
    expect(isAmbienceKind('rain')).toBe(true);
    expect(isAmbienceKind('')).toBe(false);
    expect(isAmbienceKind(null)).toBe(false);
    expect(isAmbienceKind(3)).toBe(false);
  });
});

describe('ambienceColorOf()', () => {
  it('returns the colour of the kind when none is given', () => {
    expect(ambienceColorOf('swamp', '')).toBe(ambiencePalette('swamp').primary);
    expect(ambienceColorOf('swamp', '   ')).toBe(ambiencePalette('swamp').primary);
  });

  it('takes the one that is', () => {
    expect(ambienceColorOf('swamp', '#123456')).toBe('#123456');
  });
});

describe('ambienceDensityOf()', () => {
  it('keeps it between none and all', () => {
    expect(ambienceDensityOf(-1)).toBe(0);
    expect(ambienceDensityOf(2)).toBe(1);
    expect(ambienceDensityOf(0.4)).toBe(0.4);
  });

  it('falls back to the default for anything that is not a number', () => {
    expect(ambienceDensityOf(Number.NaN)).toBe(0.6);
  });
});

describe('the list of kinds', () => {
  it('gives every kind on either list a colour', () => {
    for (const kind of [...SKY_AMBIENCE_KINDS, ...GROUND_AMBIENCE_KINDS]) {
      expect(ambiencePalette(kind).primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(ambiencePalette(kind).secondary).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
