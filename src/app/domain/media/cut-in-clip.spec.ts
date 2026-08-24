import { clipCss, clipPoints, CUT_IN_CLIPS, isCutInClip } from '@axe/domain/media/cut-in-clip';

describe('isCutInClip()', () => {
  it('knows the shapes it has', () => {
    for (const clip of CUT_IN_CLIPS) expect(isCutInClip(clip)).toBe(true);
  });

  it('turns away anything else', () => {
    expect(isCutInClip('trapezoid')).toBe(false);
    expect(isCutInClip(null)).toBe(false);
  });
});

describe('clipPoints()', () => {
  it('cuts nothing off a layer keeping its own box', () => {
    expect(clipPoints('none')).toEqual([]);
  });

  it('leaves a round one to the browser rather than to corners', () => {
    expect(clipPoints('circle')).toEqual([]);
    expect(clipCss('circle')).toContain('ellipse');
  });

  it('leans a window over without changing how wide it is', () => {
    const corners = clipPoints('slant');

    expect(corners).toHaveLength(4);
    expect(corners[0][0]).toBeGreaterThan(0);
    expect(corners[1][0]).toBe(1);
    expect(corners[3][0]).toBe(0);
  });

  it('leans the other one the other way', () => {
    expect(clipPoints('slantBack')[0][0]).toBe(0);
    expect(clipPoints('slant')[0][0]).toBeGreaterThan(0);
  });

  it('bites teeth into a torn edge', () => {
    const corners = clipPoints('torn');

    expect(corners.length).toBeGreaterThan(8);
    // Something has to come in from the edge, or it is not torn.
    expect(corners.some(([x]) => x > 0 && x < 1)).toBe(true);
  });

  it('tears the same way every time, so a room looks the same on every screen', () => {
    expect(clipPoints('torn')).toEqual(clipPoints('torn'));
  });

  it('gives a burst points that reach out and come back', () => {
    const reaches = clipPoints('burst').map(([x, y]) => Math.hypot(x - 0.5, y - 0.5));

    expect(Math.max(...reaches)).toBeGreaterThan(0.4);
    expect(Math.min(...reaches)).toBeLessThan(0.3);
  });

  it('gives a star ten corners', () => {
    expect(clipPoints('star')).toHaveLength(10);
  });

  it('keeps every shape inside the layer it belongs to', () => {
    for (const clip of CUT_IN_CLIPS) {
      for (const [x, y] of clipPoints(clip)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('clipCss()', () => {
  it('says nothing for a layer keeping its own box', () => {
    expect(clipCss('none')).toBe('');
  });

  it('writes the corners out as a polygon', () => {
    const css = clipCss('slant');

    expect(css.startsWith('polygon(')).toBe(true);
    expect(css).toContain('%');
    expect(css.split(',')).toHaveLength(4);
  });

  it('has something to say for every shape', () => {
    for (const clip of CUT_IN_CLIPS) {
      if (clip === 'none') continue;
      expect(clipCss(clip).length).toBeGreaterThan(0);
    }
  });
});
