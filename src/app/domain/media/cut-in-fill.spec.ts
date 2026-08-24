import { type CutInFill, fillCss, fillStops, isCutInFillShape, STRIPE_WIDTH_PX } from '@axe/domain/media/cut-in-fill';

const fill = (overrides: Partial<CutInFill> = {}): CutInFill => ({
  shape: 'linear',
  from: '#000000',
  mid: '',
  to: '',
  angleDeg: 90,
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
    expect(css).toContain(`#000000 0px, #000000 ${STRIPE_WIDTH_PX}px`);
    expect(css).toContain(`#ffffff ${STRIPE_WIDTH_PX}px, #ffffff ${STRIPE_WIDTH_PX * 2}px`);
  });

  it('falls back on a sensible angle where none makes sense', () => {
    expect(fillCss(fill({ to: '#ffffff', angleDeg: Number.NaN }))).toContain('90deg');
  });
});
