import {
  cubicBezierAt,
  CUT_IN_EASING_NAMES,
  CUT_IN_EASINGS,
  DEFAULT_CUT_IN_EASING,
  easingAt,
  easingCss,
  isCutInEasing,
  readCutInEasing,
} from '@axe/domain/media/cubic-bezier';

describe('isCutInEasing()', () => {
  it('knows the curves it has', () => {
    expect(isCutInEasing('outCubic')).toBe(true);
    expect(isCutInEasing('step')).toBe(true);
  });

  it('turns away anything else', () => {
    expect(isCutInEasing('bounce')).toBe(false);
    expect(isCutInEasing(3)).toBe(false);
    expect(isCutInEasing(null)).toBe(false);
  });
});

describe('readCutInEasing()', () => {
  it('keeps a curve it knows', () => {
    expect(readCutInEasing('linear')).toBe('linear');
  });

  it('falls back for anything else', () => {
    expect(readCutInEasing('nonsense')).toBe(DEFAULT_CUT_IN_EASING);
    expect(readCutInEasing(undefined)).toBe(DEFAULT_CUT_IN_EASING);
  });
});

describe('easingCss()', () => {
  it('writes the control points out', () => {
    expect(easingCss('outCubic')).toBe('cubic-bezier(0.215, 0.61, 0.355, 1)');
  });

  it('writes a step as a step', () => {
    expect(easingCss('step')).toBe('steps(1, end)');
  });

  it('has something to say for every curve', () => {
    for (const name of CUT_IN_EASING_NAMES) {
      expect(easingCss(name).length).toBeGreaterThan(0);
    }
  });
});

describe('easingAt()', () => {
  it('starts at nothing and ends at everything, whichever curve', () => {
    for (const name of CUT_IN_EASING_NAMES) {
      expect(easingAt(name, 0)).toBeCloseTo(0, 5);
      expect(easingAt(name, 1)).toBeCloseTo(1, 5);
    }
  });

  it('clamps what falls outside', () => {
    expect(easingAt('linear', -2)).toBe(0);
    expect(easingAt('linear', 4)).toBe(1);
  });

  it('leaves a linear curve as the fraction itself', () => {
    expect(easingAt('linear', 0.25)).toBeCloseTo(0.25, 5);
    expect(easingAt('linear', 0.5)).toBeCloseTo(0.5, 5);
  });

  it('holds a step until the very end', () => {
    expect(easingAt('step', 0.01)).toBe(0);
    expect(easingAt('step', 0.99)).toBe(0);
    expect(easingAt('step', 1)).toBe(1);
  });

  it('runs ahead of the clock easing out, and behind it easing in', () => {
    expect(easingAt('outCubic', 0.5)).toBeGreaterThan(0.5);
    expect(easingAt('inCubic', 0.5)).toBeLessThan(0.5);
  });

  it('overshoots and comes back on the curve that is meant to', () => {
    const points = CUT_IN_EASINGS.outBack;
    expect(points).not.toBeNull();

    const peak = Math.max(...[0.7, 0.8, 0.9].map((at) => easingAt('outBack', at)));
    expect(peak).toBeGreaterThan(1);
    expect(easingAt('outBack', 1)).toBeCloseTo(1, 5);
  });

  it('never turns back on itself, except where it is meant to', () => {
    for (const name of CUT_IN_EASING_NAMES) {
      if (name === 'outBack' || name === 'step') continue;
      let previous = -1;
      for (let at = 0; at <= 1.0001; at += 0.05) {
        const value = easingAt(name, at);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-6);
        previous = value;
      }
    }
  });
});

describe('cubicBezierAt()', () => {
  it('takes the straight line as itself', () => {
    expect(cubicBezierAt(0, 0, 1, 1, 0.37)).toBeCloseTo(0.37, 6);
  });

  it('holds the ends', () => {
    expect(cubicBezierAt(0.42, 0, 0.58, 1, 0)).toBe(0);
    expect(cubicBezierAt(0.42, 0, 0.58, 1, 1)).toBe(1);
  });

  it('crosses the middle of a symmetric curve halfway', () => {
    expect(cubicBezierAt(0.42, 0, 0.58, 1, 0.5)).toBeCloseTo(0.5, 4);
  });
});
