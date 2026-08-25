import {
  bandDraggedTo,
  bandEdgeAt,
  barRect,
  clampZoom,
  formatMs,
  keyAtX,
  keyBeyond,
  MAX_TIMELINE_ZOOM,
  MIN_TIMELINE_ZOOM,
  msToX,
  pxPerSecFor,
  scrollToHold,
  SNAP_MS,
  snapMs,
  snapToNearby,
  trackWidthFor,
  visibleTicks,
  xToMs,
} from '@axe/features/media/cut-in-editor/cut-in-timeline-geometry';

describe('pxPerSecFor()', () => {
  it('fits the whole scene into the room it has', () => {
    expect(msToX(4000, pxPerSecFor(4000, 800))).toBeCloseTo(800, 5);
  });

  it('falls back where there is no scene or no room', () => {
    expect(pxPerSecFor(0, 800)).toBe(100);
    expect(pxPerSecFor(4000, 0)).toBe(100);
  });
});

describe('msToX() and xToMs()', () => {
  it('undo one another', () => {
    expect(xToMs(msToX(1234, 200), 200)).toBeCloseTo(1234, 5);
  });

  it('start together at nothing', () => {
    expect(msToX(0, 200)).toBe(0);
    expect(xToMs(0, 200)).toBe(0);
  });

  it('reads nothing off a scale of nothing', () => {
    expect(xToMs(100, 0)).toBe(0);
  });
});

describe('snapMs()', () => {
  it('rounds to the grid', () => {
    expect(snapMs(1234, 5000)).toBe(1230);
    expect(snapMs(1236, 5000)).toBe(1240);
  });

  it('never leaves the scene', () => {
    expect(snapMs(-500, 5000)).toBe(0);
    expect(snapMs(9000, 5000)).toBe(5000);
  });

  it('takes a grid of its own', () => {
    expect(snapMs(1234, 5000, 500)).toBe(1000);
  });
});

describe('barRect()', () => {
  const pxPerSec = 100;

  it('runs the whole track for a layer with no end', () => {
    expect(barRect({ startMs: 0, endMs: 0 }, 4000, pxPerSec)).toEqual({ left: 0, width: 400 });
  });

  it('starts and ends where the layer does', () => {
    expect(barRect({ startMs: 1000, endMs: 3000 }, 4000, pxPerSec)).toEqual({ left: 100, width: 200 });
  });

  it('is held inside the scene', () => {
    expect(barRect({ startMs: 0, endMs: 9000 }, 4000, pxPerSec).width).toBe(400);
  });

  it('stays wide enough to be seen', () => {
    expect(barRect({ startMs: 1000, endMs: 1000 }, 4000, pxPerSec).width).toBe(1);
  });
});

describe('visibleTicks()', () => {
  it('reads nothing off a scene of nothing', () => {
    expect(visibleTicks(0, 100)).toEqual([]);
  });

  it('starts at nothing and reaches the end', () => {
    const ticks = visibleTicks(3000, 100);

    expect(ticks[0].ms).toBe(0);
    expect(ticks[ticks.length - 1].ms).toBe(3000);
  });

  it('marks every fifth as a major', () => {
    const ticks = visibleTicks(3000, 100);

    expect(ticks[0].major).toBe(true);
    expect(ticks[1].major).toBe(false);
    expect(ticks[5].major).toBe(true);
  });

  it('keeps the readings apart on a long scene', () => {
    const pxPerSec = pxPerSecFor(60_000, 600);
    const ticks = visibleTicks(60_000, pxPerSec);

    for (let at = 1; at < ticks.length; at++) {
      expect(msToX(ticks[at].ms - ticks[at - 1].ms, pxPerSec)).toBeGreaterThanOrEqual(8);
    }
  });

  it('does not leave a short scene with one tick', () => {
    expect(visibleTicks(300, pxPerSecFor(300, 600)).length).toBeGreaterThan(2);
  });
});

describe('keyAtX()', () => {
  const moments = [0, 500, 1000];
  const pxPerSec = 100;

  it('finds the key under the pointer', () => {
    expect(keyAtX(moments, 50, pxPerSec)).toBe(500);
  });

  it('finds one near enough to it', () => {
    expect(keyAtX(moments, 53, pxPerSec)).toBe(500);
  });

  it('finds none where there is nothing near', () => {
    expect(keyAtX(moments, 30, pxPerSec)).toBeNull();
  });

  it('takes the nearest where two are within reach', () => {
    expect(keyAtX([500, 520], 51, pxPerSec)).toBe(500);
  });

  it('finds none on an empty track', () => {
    expect(keyAtX([], 50, pxPerSec)).toBeNull();
  });
});

describe('formatMs()', () => {
  it('writes the clock out', () => {
    expect(formatMs(0)).toBe('0:00.00');
    expect(formatMs(1234)).toBe('0:01.23');
    expect(formatMs(65_400)).toBe('1:05.40');
  });

  it('never goes below nothing', () => {
    expect(formatMs(-100)).toBe('0:00.00');
  });
});

describe('drawing the timeline out', () => {
  it('leaves it fitted to the room it has at rest', () => {
    expect(trackWidthFor(800, 1)).toBe(800);
  });

  it('draws it out by the scale asked for', () => {
    expect(trackWidthFor(800, 4)).toBe(3200);
  });

  it('will not be drawn in narrower than the room it has', () => {
    expect(trackWidthFor(800, 0.25)).toBe(800);
    expect(clampZoom(0.25)).toBe(MIN_TIMELINE_ZOOM);
  });

  it('stops at a scale past which nothing more can be read', () => {
    expect(clampZoom(1000)).toBe(MAX_TIMELINE_ZOOM);
  });

  it('takes a scale that means nothing as no scale at all', () => {
    expect(clampZoom(Number.NaN)).toBe(MIN_TIMELINE_ZOOM);
  });

  describe('keeping a moment where it was', () => {
    it('holds the moment under the pointer as it leans in', () => {
      // Half a second into a two-second scene, held four hundred across an eight-hundred track.
      const scrolled = scrollToHold(500, 2000, 800, 4, 400);

      // At four times, half a second sits eight hundred along; held at four hundred, that is four hundred scrolled.
      expect(scrolled).toBe(400);
    });

    it('never scrolls past the head of the track', () => {
      expect(scrollToHold(0, 2000, 800, 4, 400)).toBe(0);
    });

    it('never scrolls past the tail of it', () => {
      expect(scrollToHold(2000, 2000, 800, 4, 0)).toBe(3200 - 800);
    });
  });
});

describe('keyBeyond()', () => {
  const times = [0, 300, 300, 1200];

  it('finds the next one along', () => {
    expect(keyBeyond(times, 0, true)).toBe(300);
    expect(keyBeyond(times, 300, true)).toBe(1200);
  });

  it('finds the one before', () => {
    expect(keyBeyond(times, 1200, false)).toBe(300);
    expect(keyBeyond(times, 300, false)).toBe(0);
  });

  it('has nothing to find past either end', () => {
    expect(keyBeyond(times, 1200, true)).toBeNull();
    expect(keyBeyond(times, 0, false)).toBeNull();
  });

  it('finds nothing where there are no keys', () => {
    expect(keyBeyond([], 500, true)).toBeNull();
  });
});

describe('taking hold of a band', () => {
  const bar = { left: 100, width: 200 };

  it('takes the near end where the pointer is on it', () => {
    expect(bandEdgeAt(bar, 100)).toBe('start');
    expect(bandEdgeAt(bar, 103)).toBe('start');
  });

  it('takes the far end the same way', () => {
    expect(bandEdgeAt(bar, 300)).toBe('end');
    expect(bandEdgeAt(bar, 297)).toBe('end');
  });

  it('takes neither in the middle of it, which is where a key would be', () => {
    expect(bandEdgeAt(bar, 200)).toBeNull();
  });

  it('takes neither off the band altogether', () => {
    expect(bandEdgeAt(bar, 20)).toBeNull();
    expect(bandEdgeAt(bar, 400)).toBeNull();
  });
});

describe('dragging a band by its ends', () => {
  const layer = { startMs: 200, endMs: 800 };

  it('moves the near end to the moment dragged to', () => {
    expect(bandDraggedTo(layer, 'start', 400, 2000)).toEqual({ startMs: 400, endMs: 800 });
  });

  it('moves the far end to it', () => {
    expect(bandDraggedTo(layer, 'end', 1200, 2000)).toEqual({ startMs: 200, endMs: 1200 });
  });

  it('will not let the ends cross, nor the band close up altogether', () => {
    expect(bandDraggedTo(layer, 'start', 1500, 2000).startMs).toBe(800 - SNAP_MS);
    expect(bandDraggedTo(layer, 'end', 0, 2000).endMs).toBe(200 + SNAP_MS);
  });

  it('holds either end inside the scene', () => {
    expect(bandDraggedTo(layer, 'start', -500, 2000).startMs).toBe(0);
    expect(bandDraggedTo(layer, 'end', 9000, 2000).endMs).toBe(0);
  });

  it('keeps an end at the close of the scene as running to the end', () => {
    // Nought is what the layer means by 'as long as the scene is', however long that becomes.
    expect(bandDraggedTo(layer, 'end', 2000, 2000).endMs).toBe(0);
  });

  it('reads a layer that already runs to the end as ending there', () => {
    expect(bandDraggedTo({ startMs: 0, endMs: 0 }, 'start', 500, 2000)).toEqual({ startMs: 500, endMs: 0 });
  });
});

describe('snapToNearby()', () => {
  // A hundred pixels to the second, so ten ms comes to a pixel.
  const PX_PER_SEC = 100;

  it('lands on a moment worth landing on where one is near enough', () => {
    expect(snapToNearby(497, [500, 1200], 2000, PX_PER_SEC)).toBe(500);
  });

  it('falls back to the grid where none is', () => {
    expect(snapToNearby(497, [1200], 2000, PX_PER_SEC)).toBe(500);
    expect(snapToNearby(493, [1200], 2000, PX_PER_SEC)).toBe(490);
  });

  it('takes the nearest of several', () => {
    expect(snapToNearby(514, [500, 520], 2000, PX_PER_SEC)).toBe(520);
    expect(snapToNearby(506, [500, 520], 2000, PX_PER_SEC)).toBe(500);
  });

  it('is not drawn to one too far off to be meant', () => {
    // A hundred ms away is a whole pixel-per-ten, well past the reach of the magnet.
    expect(snapToNearby(700, [500], 2000, PX_PER_SEC)).toBe(700);
  });

  it('measures nearness on screen, so it holds however far the timeline is drawn out', () => {
    // Drawn out ten times, the same hundred ms is far too wide to be drawn across.
    expect(snapToNearby(600, [500], 2000, PX_PER_SEC * 10)).toBe(600);
    // Drawn in, the same gap is under a pixel.
    expect(snapToNearby(600, [500], 2000, PX_PER_SEC / 20)).toBe(500);
  });

  it('holds the answer inside the scene', () => {
    expect(snapToNearby(-200, [], 2000, PX_PER_SEC)).toBe(0);
    expect(snapToNearby(9000, [], 2000, PX_PER_SEC)).toBe(2000);
  });
});
