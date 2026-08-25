import {
  type CutInFill,
  DEFAULT_FILL_SCALE_PX,
  fillCss,
  fillScaleOf,
  fillStops,
  isCutInFillShape,
  MAX_FILL_SCALE_PX,
  MIN_FILL_SCALE_PX,
  rayDegOf,
} from '@axe/domain/media/cut-in-fill';

const fill = (overrides: Partial<CutInFill> = {}): CutInFill => ({
  shape: 'linear',
  from: '#000000',
  mid: '',
  to: '',
  angleDeg: 90,
  scalePx: DEFAULT_FILL_SCALE_PX,
  ...overrides,
});

describe('isCutInFillShape()', () => {
  it('knows the shapes a band may take', () => {
    expect(isCutInFillShape('linear')).toBe(true);
    expect(isCutInFillShape('stripes')).toBe(true);
  });

  it('turns away anything else', () => {
    expect(isCutInFillShape('spiral')).toBe(false);
    expect(isCutInFillShape(null)).toBe(false);
  });
});

describe('fillStops()', () => {
  it('is one colour for a flat band', () => {
    expect(fillStops(fill())).toEqual(['#000000']);
  });

  it('runs from one colour to another', () => {
    expect(fillStops(fill({ to: '#ffffff' }))).toEqual(['#000000', '#ffffff']);
  });

  it('passes through the middle colour on the way', () => {
    expect(fillStops(fill({ mid: '#ff0000', to: '#ffffff' }))).toEqual(['#000000', '#ff0000', '#ffffff']);
  });
});

describe('fillCss()', () => {
  it('writes one flat colour as itself', () => {
    expect(fillCss(fill())).toBe('#000000');
  });

  it('writes transparent for a band with no colour at all', () => {
    expect(fillCss(fill({ from: '' }))).toBe('transparent');
  });

  it('writes a straight run at the angle it was given', () => {
    expect(fillCss(fill({ to: '#ffffff', angleDeg: 45 }))).toBe('linear-gradient(45deg, #000000, #ffffff)');
  });

  it('writes a round one from the middle out', () => {
    expect(fillCss(fill({ shape: 'radial', to: '#ffffff' }))).toBe(
      'radial-gradient(circle at 50% 50%, #000000, #ffffff)'
    );
  });

  it('closes a swept one back on the colour it started from', () => {
    expect(fillCss(fill({ shape: 'conic', to: '#ffffff', angleDeg: 0 }))).toBe(
      'conic-gradient(from 0deg at 50% 50%, #000000, #ffffff, #000000)'
    );
  });

  it('gives stripes hard edges rather than a run of colour', () => {
    const css = fillCss(fill({ shape: 'stripes', to: '#ffffff' }));

    expect(css).toContain('repeating-linear-gradient(90deg,');
    expect(css).toContain(`#000000 0px, #000000 ${DEFAULT_FILL_SCALE_PX}px`);
    expect(css).toContain(`#ffffff ${DEFAULT_FILL_SCALE_PX}px, #ffffff ${DEFAULT_FILL_SCALE_PX * 2}px`);
  });

  it('falls back on a sensible angle where none makes sense', () => {
    expect(fillCss(fill({ to: '#ffffff', angleDeg: Number.NaN }))).toContain('90deg');
  });
});

describe('fillScaleOf()', () => {
  it('falls back where the fill was given no size to repeat at', () => {
    expect(fillScaleOf(fill({ scalePx: 0 }))).toBe(DEFAULT_FILL_SCALE_PX);
    expect(fillScaleOf(fill({ scalePx: Number.NaN }))).toBe(DEFAULT_FILL_SCALE_PX);
  });

  it('holds it to what can still be seen', () => {
    expect(fillScaleOf(fill({ scalePx: 1 }))).toBe(MIN_FILL_SCALE_PX);
    expect(fillScaleOf(fill({ scalePx: 9999 }))).toBe(MAX_FILL_SCALE_PX);
  });

  it('takes what it is given in between', () => {
    expect(fillScaleOf(fill({ scalePx: 40 }))).toBe(40);
  });
});

describe('rayDegOf()', () => {
  it('makes a ray wider as the fill is told to repeat more coarsely', () => {
    expect(rayDegOf(fill({ scalePx: 60 }))).toBeGreaterThan(rayDegOf(fill({ scalePx: 12 })));
  });

  it('never lets a ray vanish or swallow the circle', () => {
    expect(rayDegOf(fill({ scalePx: MIN_FILL_SCALE_PX }))).toBeGreaterThan(0);
    expect(rayDegOf(fill({ scalePx: MAX_FILL_SCALE_PX }))).toBeLessThanOrEqual(20);
  });
});

describe('the fills that draw a pattern', () => {
  it('converges lines on the middle', () => {
    const css = fillCss(fill({ shape: 'speedlines', from: '#111111', angleDeg: 0 }));

    expect(css).toContain('repeating-conic-gradient(from 0deg at 50% 50%');
    expect(css).toContain('#111111 0deg');
  });

  it('clears the middle when told what colour to clear it with', () => {
    const css = fillCss(fill({ shape: 'speedlines', from: '#111111', to: '#ffffff' }));

    expect(css.startsWith('radial-gradient(circle at 50% 50%, #ffffff')).toBe(true);
    expect(css).toContain('repeating-conic-gradient');
  });

  it('leaves the middle alone where no colour is given for it', () => {
    expect(fillCss(fill({ shape: 'speedlines', from: '#111111' })).startsWith('repeating-conic')).toBe(true);
  });

  it('lays dots out on a grid at the size it was given', () => {
    const css = fillCss(fill({ shape: 'halftone', from: '#000000', scalePx: 10 }));

    expect(css).toContain('radial-gradient(circle at 50% 50%, #000000');
    expect(css).toContain('/ 10px 10px');
  });

  it('puts a ground behind the dots when told to', () => {
    expect(fillCss(fill({ shape: 'halftone', from: '#000000', to: '#ffcc00' }))).toContain('#ffcc00');
  });

  it('needs only one colour to draw a pattern', () => {
    expect(fillCss(fill({ shape: 'speedlines', from: '#111111' })).length).toBeGreaterThan(0);
    expect(fillCss(fill({ shape: 'halftone', from: '#111111' })).length).toBeGreaterThan(0);
  });
});
