import { asFogMode, DEFAULT_FOG_MODE, FOG_MODES, fogRules } from '@axe/domain/tabletop/fog/fog-mode';

describe('asFogMode', () => {
  it('takes a mode it knows', () => {
    for (const mode of FOG_MODES) expect(asFogMode(mode)).toBe(mode);
  });

  it('falls back on anything else, a room that never said included', () => {
    expect(asFogMode('lenient')).toBe(DEFAULT_FOG_MODE);
    expect(asFogMode(undefined)).toBe(DEFAULT_FOG_MODE);
  });

  it('starts a room on the middle of the three', () => {
    expect(DEFAULT_FOG_MODE).toBe('normal');
  });
});

describe('fogRules', () => {
  it('closes the fog behind the party on the hard one, and follows nothing', () => {
    expect(fogRules('hard')).toEqual({
      remembersGround: false,
      clearedStaysLit: false,
      tracksFoundPieces: false,
    });
  });

  it('keeps the ground walked to on the middle one, and no more than that', () => {
    expect(fogRules('normal')).toEqual({
      remembersGround: true,
      clearedStaysLit: false,
      tracksFoundPieces: false,
    });
  });

  it('holds cleared ground in plain sight on the easy one, and follows what was found', () => {
    expect(fogRules('easy')).toEqual({
      remembersGround: true,
      clearedStaysLit: true,
      tracksFoundPieces: true,
    });
  });

  it('answers for a room that never said, as the default does', () => {
    expect(fogRules(undefined)).toEqual(fogRules(DEFAULT_FOG_MODE));
  });
});
