import {
  isVnPortraitPosSet,
  toPortraitSlot,
  toStageResetAt,
  VN_PORTRAIT_POS_UNSET,
} from '@axe/domain/visual-novel/vn-portrait-position';

describe('isVnPortraitPosSet()', () => {
  it('reads the unset marker as nothing chosen', () => {
    expect(isVnPortraitPosSet(VN_PORTRAIT_POS_UNSET)).toBe(false);
  });

  it('reads either end of the stage as chosen', () => {
    expect(isVnPortraitPosSet(0)).toBe(true);
    expect(isVnPortraitPosSet(11)).toBe(true);
  });

  it('reads a place off the stage as nothing chosen', () => {
    expect(isVnPortraitPosSet(12)).toBe(false);
  });

  it('reads a missing attribute as nothing chosen, not as the left edge', () => {
    // ObjectNode hands back '' for a key it does not hold, and '' passes both ends of a
    // plain range comparison.
    expect(isVnPortraitPosSet('')).toBe(false);
    expect(isVnPortraitPosSet(undefined)).toBe(false);
    expect(isVnPortraitPosSet(null)).toBe(false);
  });
});

describe('toPortraitSlot()', () => {
  it('takes a number as it is', () => {
    expect(toPortraitSlot(7)).toBe(7);
  });

  it('takes the string older saved data holds', () => {
    expect(toPortraitSlot('7')).toBe(7);
  });

  it('finds nothing where nothing was written', () => {
    expect(toPortraitSlot(undefined)).toBeNull();
    expect(toPortraitSlot(null)).toBeNull();
  });

  it('finds nothing in what is not a number at all', () => {
    expect(toPortraitSlot('ゴブリン')).toBeNull();
  });

  it('finds nothing in a place off the stage', () => {
    expect(toPortraitSlot(-1)).toBeNull();
    expect(toPortraitSlot(12)).toBeNull();
  });
});

describe('toStageResetAt()', () => {
  it('reads a moment as itself', () => {
    expect(toStageResetAt(1700000000000)).toBe(1700000000000);
  });

  it('reads a moment written back from a saved room as a string', () => {
    expect(toStageResetAt('1700000000000')).toBe(1700000000000);
  });

  it('takes anything that is not a moment as never cleared', () => {
    expect(toStageResetAt('')).toBe(0);
    expect(toStageResetAt(null)).toBe(0);
    expect(toStageResetAt(undefined)).toBe(0);
    expect(toStageResetAt('いつか')).toBe(0);
    expect(toStageResetAt(0)).toBe(0);
    expect(toStageResetAt(-1)).toBe(0);
  });
});
