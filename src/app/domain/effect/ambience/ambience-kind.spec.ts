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
  it('知らない値は既定へ倒すこと', () => {
    expect(ambienceKindOf('swamp')).toBe('swamp');
    expect(ambienceKindOf('unknown')).toBe('fog');
    expect(ambienceKindOf(undefined, 'lava')).toBe('lava');
  });
});

describe('isAmbienceKind()', () => {
  it('文字列以外を弾くこと', () => {
    expect(isAmbienceKind('rain')).toBe(true);
    expect(isAmbienceKind('')).toBe(false);
    expect(isAmbienceKind(null)).toBe(false);
    expect(isAmbienceKind(3)).toBe(false);
  });
});

describe('ambienceColorOf()', () => {
  it('空なら種類ごとの既定色を返すこと', () => {
    expect(ambienceColorOf('swamp', '')).toBe(ambiencePalette('swamp').primary);
    expect(ambienceColorOf('swamp', '   ')).toBe(ambiencePalette('swamp').primary);
  });

  it('指定があればそれを使うこと', () => {
    expect(ambienceColorOf('swamp', '#123456')).toBe('#123456');
  });
});

describe('ambienceDensityOf()', () => {
  it('0〜1 に収めること', () => {
    expect(ambienceDensityOf(-1)).toBe(0);
    expect(ambienceDensityOf(2)).toBe(1);
    expect(ambienceDensityOf(0.4)).toBe(0.4);
  });

  it('数でない値は既定へ倒すこと', () => {
    expect(ambienceDensityOf(Number.NaN)).toBe(0.6);
  });
});

describe('種類の一覧', () => {
  it('どの一覧の種類にも色が用意されていること', () => {
    for (const kind of [...SKY_AMBIENCE_KINDS, ...GROUND_AMBIENCE_KINDS]) {
      expect(ambiencePalette(kind).primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(ambiencePalette(kind).secondary).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
