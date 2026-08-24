import {
  CHEVRON_LEAD,
  CRUMBLE_REACH,
  CUT_IN_WIPES,
  isCutInWipe,
  wipeAmount,
  wipeCss,
  wipePoints,
} from '@axe/domain/media/cut-in-wipe';

describe('isCutInWipe()', () => {
  it('knows the ways it has of letting a layer in', () => {
    for (const wipe of CUT_IN_WIPES) expect(isCutInWipe(wipe)).toBe(true);
  });

  it('turns away anything else', () => {
    expect(isCutInWipe('spiral')).toBe(false);
    expect(isCutInWipe(null)).toBe(false);
  });
});

describe('wipeAmount()', () => {
  it('holds it between none and all', () => {
    expect(wipeAmount(-1)).toBe(0);
    expect(wipeAmount(2)).toBe(1);
    expect(wipeAmount(0.4)).toBe(0.4);
  });

  it('lets the whole layer in where the figure means nothing', () => {
    expect(wipeAmount(Number.NaN)).toBe(1);
  });
});

describe('wipePoints()', () => {
  it('leaves a layer alone where the whole of it is let in at once', () => {
    expect(wipePoints('none', 0.5)).toEqual([]);
    expect(wipeCss('none', 0.5)).toBe('');
  });

  it('lets nothing in at nothing, and everything in at everything', () => {
    for (const wipe of CUT_IN_WIPES) {
      if (wipe === 'none') continue;

      const closed = wipePoints(wipe, 0);
      const open = wipePoints(wipe, 1);
      expect(area(closed)).toBeLessThan(0.15);
      expect(area(open)).toBeGreaterThan(0.85);
    }
  });

  it('keeps the same corners however far along it is, so a browser can travel between them', () => {
    for (const wipe of CUT_IN_WIPES) {
      if (wipe === 'none') continue;

      const counts = [0, 0.25, 0.5, 0.75, 1].map((at) => wipePoints(wipe, at).length);
      expect(new Set(counts).size).toBe(1);
    }
  });

  it('lets a layer in from the left, going right', () => {
    const half = wipePoints('right', 0.5);

    expect(half[0]).toEqual([0, 0]);
    expect(half[1]).toEqual([0.5, 0]);
  });

  it('runs the point of a chevron ahead of its edge', () => {
    const half = wipePoints('chevronRight', 0.5);

    expect(half[1][0]).toBe(0.5);
    expect(half[2][0]).toBeCloseTo(0.5 + CHEVRON_LEAD, 5);
    expect(half[2][1]).toBe(0.5);
  });

  it('never lets the point of a chevron run off the layer', () => {
    expect(wipePoints('chevronRight', 1)[2][0]).toBe(1);
    expect(wipePoints('chevronLeft', 1)[2][0]).toBe(0);
  });

  it('runs the other chevron the other way', () => {
    expect(wipePoints('chevronLeft', 0.5)[1][0]).toBe(0.5);
    expect(wipePoints('chevronLeft', 0.5)[2][0]).toBeCloseTo(0.5 - CHEVRON_LEAD, 5);
  });

  it('keeps every corner inside the layer', () => {
    for (const wipe of CUT_IN_WIPES) {
      for (const at of [0, 0.3, 0.7, 1]) {
        for (const [x, y] of wipePoints(wipe, at)) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe('wipeCss()', () => {
  it('writes the corners out as a polygon', () => {
    const css = wipeCss('right', 0.5);

    expect(css.startsWith('polygon(')).toBe(true);
    expect(css.split(',')).toHaveLength(4);
  });
});

describe('an edge that crumbles', () => {
  it('breaks up rather than travelling as one clean line', () => {
    const edges = wipePoints('crumbleRight', 0.5)
      .slice(0, -2)
      .map(([x]) => x);

    // The fingers reach different distances, which is what makes it come away in pieces.
    expect(new Set(edges).size).toBeGreaterThan(4);
    expect(Math.max(...edges) - Math.min(...edges)).toBeGreaterThan(CRUMBLE_REACH / 2);
  });

  it('eats a layer from the left when it is told to', () => {
    const most = wipePoints('crumbleLeft', 0.8)
      .slice(0, -2)
      .map(([x]) => x);
    const little = wipePoints('crumbleLeft', 0.2)
      .slice(0, -2)
      .map(([x]) => x);

    // Less left means the edge has eaten further across.
    expect(Math.min(...little)).toBeGreaterThan(Math.min(...most));
  });

  it('eats it from the right the other way round', () => {
    const most = wipePoints('crumbleRight', 0.8)
      .slice(0, -2)
      .map(([x]) => x);
    const little = wipePoints('crumbleRight', 0.2)
      .slice(0, -2)
      .map(([x]) => x);

    expect(Math.max(...little)).toBeLessThan(Math.max(...most));
  });

  it('crumbles the same way twice, so a room looks the same on every screen', () => {
    expect(wipePoints('crumbleLeft', 0.4)).toEqual(wipePoints('crumbleLeft', 0.4));
  });
});

/** The area a closed outline covers, by the shoelace formula. */
function area(points: readonly (readonly [number, number])[]): number {
  if (points.length < 3) return 0;

  let sum = 0;
  for (let at = 0; at < points.length; at++) {
    const [x1, y1] = points[at];
    const [x2, y2] = points[(at + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}
