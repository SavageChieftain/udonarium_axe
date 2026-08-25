import {
  CUT_IN_EFFECTS,
  effectAt,
  effectFilter,
  effectMovesOverTime,
  isCutInEffect,
} from '@axe/domain/media/cut-in-effect';

describe('isCutInEffect()', () => {
  it('knows the touches it has', () => {
    for (const effect of CUT_IN_EFFECTS) expect(isCutInEffect(effect)).toBe(true);
  });

  it('turns away anything else', () => {
    expect(isCutInEffect('sparkle')).toBe(false);
    expect(isCutInEffect(undefined)).toBe(false);
  });
});

describe('effectMovesOverTime()', () => {
  it('knows which ones the clock changes', () => {
    expect(effectMovesOverTime('shake')).toBe(true);
    expect(effectMovesOverTime('blink')).toBe(true);
    expect(effectMovesOverTime('pulse')).toBe(true);
    expect(effectMovesOverTime('float')).toBe(true);
  });

  it('knows which ones sit still', () => {
    expect(effectMovesOverTime('none')).toBe(false);
    expect(effectMovesOverTime('glow')).toBe(false);
    expect(effectMovesOverTime('shadow')).toBe(false);
  });
});

describe('effectAt()', () => {
  it('changes nothing without an effect', () => {
    expect(effectAt('none', 500)).toEqual({ dx: 0, dy: 0, scaleMul: 1, opacityMul: 1, glowPx: 0, shadowPx: 0 });
  });

  it('changes nothing at no strength', () => {
    expect(effectAt('shake', 500, 0).dx).toBe(0);
  });

  it('lights the layer without moving it', () => {
    const sample = effectAt('glow', 500);

    expect(sample.glowPx).toBeGreaterThan(0);
    expect(sample.dx).toBe(0);
    expect(sample.scaleMul).toBe(1);
  });

  it('drops a shadow without lighting it', () => {
    const sample = effectAt('shadow', 500);

    expect(sample.shadowPx).toBeGreaterThan(0);
    expect(sample.glowPx).toBe(0);
  });

  it('turns the layer on and off again as the clock runs', () => {
    expect(effectAt('blink', 0).opacityMul).toBe(1);
    expect(effectAt('blink', 500).opacityMul).toBeLessThan(1);
    expect(effectAt('blink', 600).opacityMul).toBe(1);
  });

  it('shifts the layer about, and further the stronger it is', () => {
    const gentle = effectAt('shake', 100, 1);
    const fierce = effectAt('shake', 100, 3);

    expect(Math.abs(gentle.dx)).toBeGreaterThan(0);
    expect(Math.abs(fierce.dx)).toBeGreaterThan(Math.abs(gentle.dx));
  });

  it('breathes around its own size', () => {
    const scales = [0, 400, 800, 1200, 1600, 2000].map((ms) => effectAt('pulse', ms).scaleMul);

    expect(Math.max(...scales)).toBeGreaterThan(1);
    expect(Math.min(...scales)).toBeLessThan(1);
  });

  it('rises and falls without drifting sideways', () => {
    expect(effectAt('float', 300).dx).toBe(0);
    expect(Math.abs(effectAt('float', 300).dy)).toBeGreaterThan(0);
  });

  it('holds the strength to what makes sense', () => {
    expect(Math.abs(effectAt('shake', 100, 99).dx)).toBe(Math.abs(effectAt('shake', 100, 3).dx));
    expect(effectAt('glow', 0, Number.NaN).glowPx).toBe(effectAt('glow', 0, 1).glowPx);
  });
});

describe('effectFilter()', () => {
  it('asks for nothing where nothing shines', () => {
    expect(effectFilter(effectAt('none', 0), '#ffffff')).toEqual([]);
  });

  it('spreads the light in the colour it is given', () => {
    expect(effectFilter(effectAt('glow', 0), '#ff8800')[0]).toContain('#ff8800');
  });

  it('falls back on a colour where none is given', () => {
    expect(effectFilter(effectAt('glow', 0), '')[0]).toContain('#ffffff');
  });

  it('offsets a shadow rather than centring it', () => {
    expect(effectFilter(effectAt('shadow', 0), '#ffffff')[0]).toContain('drop-shadow(3px 3px');
  });
});
