import {
  fitHandFanOptions,
  HAND_CARD_WIDTH_PX,
  HAND_FAN_MAX_STEP_PX,
  HAND_FAN_MIN_STEP_PX,
  HAND_FAN_VISIBLE_CARDS,
  HAND_RAIL_CHROME_PX,
  handFanDropIndex,
  handFanWidthPx,
  layoutHandFan,
} from '@axe/features/card/hand-rail/hand-fan';
import { describe, expect, it } from 'vitest';

describe('handFanWidthPx', () => {
  it('returns the width of the cards it shows', () => {
    expect(handFanWidthPx()).toBe(HAND_CARD_WIDTH_PX + HAND_FAN_MAX_STEP_PX * (HAND_FAN_VISIBLE_CARDS - 1));
  });

  it('returns the width of however many it is asked for', () => {
    expect(handFanWidthPx({ cardWidthPx: 10, maxStepPx: 5, visibleCards: 3 })).toBe(20);
  });
});

describe('layoutHandFan', () => {
  const options = { cardWidthPx: 10, maxStepPx: 5, visibleCards: 3, spreadDeg: 20, arcPx: 8 };

  it('lays nothing out for an empty hand', () => {
    expect(layoutHandFan(0, options)).toEqual([]);
  });

  it('puts a single card straight in the middle', () => {
    expect(layoutHandFan(1, options)).toEqual([{ leftPx: 5, topPx: 0, rotateDeg: 0, zIndex: 0 }]);
  });

  it('tips the outer cards away and drops them along an arc', () => {
    const layout = layoutHandFan(3, options);

    expect(layout.map((entry) => entry.rotateDeg)).toEqual([-10, 0, 10]);
    expect(layout.map((entry) => entry.topPx)).toEqual([8, 0, 8]);
  });

  it('closes the gaps to fit the width', () => {
    const width = handFanWidthPx(options);
    const layout = layoutHandFan(9, options);

    expect(layout).toHaveLength(9);
    expect(layout[0].leftPx).toBe(0);
    expect(layout[8].leftPx + options.cardWidthPx).toBeCloseTo(width);
  });

  it('keeps a few cards together in the middle rather than spreading them', () => {
    const layout = layoutHandFan(2, options);

    expect(layout[1].leftPx - layout[0].leftPx).toBe(options.maxStepPx);
    expect(layout[0].leftPx).toBe(2.5);
  });

  it('stacks the nearer cards over the farther', () => {
    expect(layoutHandFan(4, options).map((entry) => entry.zIndex)).toEqual([0, 1, 2, 3]);
  });
});

describe('handFanDropIndex', () => {
  const options = { cardWidthPx: 10, maxStepPx: 5, visibleCards: 3, spreadDeg: 20, arcPx: 8 };

  it('puts a card dropped past the left edge at the front', () => {
    expect(handFanDropIndex(0, 3, options)).toBe(0);
  });

  it('puts one dropped past the right edge at the back', () => {
    expect(handFanDropIndex(999, 3, options)).toBe(3);
  });

  it('counts the cards it passed to find the place', () => {
    expect(handFanDropIndex(6, 3, options)).toBe(1);
    expect(handFanDropIndex(11, 3, options)).toBe(2);
  });

  it('returns the front for an empty hand', () => {
    expect(handFanDropIndex(50, 0, options)).toBe(0);
  });
});

describe('fitHandFanOptions', () => {
  it('leaves the fan as it is on a wide screen', () => {
    expect(fitHandFanOptions(1200)).toEqual({});
  });

  it('overlaps the cards until the fan fits a narrow one', () => {
    const options = fitHandFanOptions(390);
    expect(handFanWidthPx(options)).toBeLessThanOrEqual(390 - HAND_RAIL_CHROME_PX);
  });

  it('keeps a smallest gap however narrow it gets', () => {
    const options = fitHandFanOptions(120);
    expect(options.maxStepPx).toBe(HAND_FAN_MIN_STEP_PX);
  });

  it('keeps the order of the cards on a narrow screen', () => {
    const layout = layoutHandFan(8, fitHandFanOptions(390));
    const lefts = layout.map((entry) => entry.leftPx);
    expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);
  });
});
