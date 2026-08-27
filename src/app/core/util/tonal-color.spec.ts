import {
  contrastRatio,
  lchToRgb,
  parseHexColor,
  relativeLuminance,
  rgbToCss,
  rgbToLch,
} from '@axe/core/util/tonal-color';

const HUES = ['#ff0000', '#00cc00', '#0099ff', '#9900ff', '#ffcc00', '#006633'];

describe('parseHexColor()', () => {
  it('reads both lengths and nothing else', () => {
    expect(parseHexColor('#fff')).toEqual([1, 1, 1]);
    expect(parseHexColor('#ff0000')).toEqual([1, 0, 0]);
    expect(parseHexColor('ff0000')).toEqual([1, 0, 0]);
    expect(parseHexColor('not a colour')).toBeNull();
    expect(parseHexColor('#12345')).toBeNull();
  });
});

describe('rgbToLch()', () => {
  it('puts black at the bottom of the tone scale and white at the top', () => {
    expect(rgbToLch([0, 0, 0]).tone).toBeCloseTo(0, 1);
    expect(rgbToLch([1, 1, 1]).tone).toBeCloseTo(100, 1);
  });

  it('leaves a grey with no colour in it', () => {
    expect(rgbToLch([0.5, 0.5, 0.5]).chroma).toBeCloseTo(0, 1);
  });

  it('finds the hues where they are known to be', () => {
    expect(rgbToLch([1, 0, 0]).hue).toBeCloseTo(40, 0);
    expect(rgbToLch([0, 1, 0]).hue).toBeCloseTo(136, 0);
    expect(rgbToLch([0, 0, 1]).hue).toBeCloseTo(306, 0);
  });
});

describe('lchToRgb()', () => {
  it('comes back to where it started', () => {
    for (const hex of HUES) {
      const rgb = parseHexColor(hex)!;
      const round = lchToRgb(rgbToLch(rgb));

      expect(rgbToCss(round)).toBe(rgbToCss(rgb));
    }
  });

  it('holds the tone it was asked for, whatever the hue', () => {
    for (const hue of [0, 60, 120, 180, 240, 300]) {
      for (const tone of [10, 30, 50, 70, 90]) {
        const back = rgbToLch(lchToRgb({ tone, chroma: 80, hue }));

        expect(back.tone).toBeCloseTo(tone, 0);
      }
    }
  });

  it('gives up chroma rather than tone where the screen cannot show it', () => {
    // No hue holds eighty of chroma at a tone of ten; the tone is what has to survive.
    const asked = { tone: 10, chroma: 80, hue: 136 };
    const got = rgbToLch(lchToRgb(asked));

    expect(got.tone).toBeCloseTo(10, 0);
    expect(got.chroma).toBeLessThan(asked.chroma);
    expect(got.hue).toBeCloseTo(asked.hue, 0);
  });

  it('stays inside what a screen can show', () => {
    for (const hue of [0, 90, 180, 270]) {
      for (const tone of [5, 50, 95]) {
        for (const channel of lchToRgb({ tone, chroma: 120, hue })) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe('contrastRatio()', () => {
  it('measures a pair the way the standard does', () => {
    const black = relativeLuminance([0, 0, 0]);
    const white = relativeLuminance([1, 1, 1]);

    expect(contrastRatio(white, black)).toBeCloseTo(21, 1);
    expect(contrastRatio(black, black)).toBeCloseTo(1, 5);
  });
});
