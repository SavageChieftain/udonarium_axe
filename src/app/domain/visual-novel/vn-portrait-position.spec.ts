import {
  isVnPortraitPosSet,
  toPortraitSlot,
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
