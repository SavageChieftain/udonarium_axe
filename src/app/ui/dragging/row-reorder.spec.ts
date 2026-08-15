import { landingIndex, reorderRows, RowReorder } from '@axe/ui/dragging/row-reorder';

function bounds(top: number, height: number): { top: number; height: number } {
  return { top, height };
}

describe('RowReorder', () => {
  it('holds nothing until a drag begins', () => {
    const reorder = new RowReorder<string>();

    expect(reorder.held()).toBeNull();
    expect(reorder.isHeld('a')).toBe(false);
  });

  it('holds the row it was given', () => {
    const reorder = new RowReorder<string>();

    reorder.begin('a');

    expect(reorder.isHeld('a')).toBe(true);
  });

  it('takes the side from the upper half of a row', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');

    reorder.hoverHalf('b', bounds(100, 40), 110);

    expect(reorder.isDropBefore('b')).toBe(true);
    expect(reorder.isDropAfter('b')).toBe(false);
  });

  it('takes it from the lower half', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');

    reorder.hoverHalf('b', bounds(100, 40), 130);

    expect(reorder.isDropAfter('b')).toBe(true);
  });

  it('marks no side on the row being dragged', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');

    reorder.hoverHalf('a', bounds(100, 40), 130);

    expect(reorder.isDropBefore('a')).toBe(false);
    expect(reorder.isDropAfter('a')).toBe(false);
  });

  it('hovers a row without taking a side', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');

    reorder.hover('b');

    expect(reorder.over()).toBe('b');
    expect(reorder.isDropBefore('b')).toBe(false);
  });

  it('hovers nothing before a drag begins', () => {
    const reorder = new RowReorder<string>();

    reorder.hover('b');

    expect(reorder.over()).toBeNull();
  });

  it('returns the drop and ends the drag on release', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');
    reorder.hoverHalf('b', bounds(100, 40), 130);

    expect(reorder.release()).toEqual({ held: 'a', over: 'b', side: 'after' });
    expect(reorder.held()).toBeNull();
  });

  it('returns nothing when it lands nowhere', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');

    expect(reorder.release()).toBeNull();
  });

  it('returns nothing when it lands back on itself', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');
    reorder.hover('a');

    expect(reorder.release()).toBeNull();
  });

  it('lets go of everything on a cancel', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');
    reorder.hoverHalf('b', bounds(100, 40), 130);

    reorder.cancel();

    expect(reorder.held()).toBeNull();
    expect(reorder.over()).toBeNull();
    expect(reorder.isDropAfter('b')).toBe(false);
  });

  it('keeps the drag when the pointer leaves the rows', () => {
    const reorder = new RowReorder<string>();
    reorder.begin('a');
    reorder.hoverHalf('b', bounds(100, 40), 130);

    reorder.leave();

    expect(reorder.isHeld('a')).toBe(true);
    expect(reorder.over()).toBeNull();
  });

  it('holds a row numbered zero as readily as any other', () => {
    // A sequence numbered from zero is a row like any other, and must not read as no row at all.
    const reorder = new RowReorder<number>();

    reorder.begin(0);
    reorder.hoverHalf(1, bounds(100, 40), 130);

    expect(reorder.release()).toEqual({ held: 0, over: 1, side: 'after' });
  });
});

describe('landingIndex()', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('puts a row before the one it landed on', () => {
    expect(landingIndex(order, 'a', 'c', 'before')).toBe(1);
  });

  it('puts it after', () => {
    expect(landingIndex(order, 'a', 'c', 'after')).toBe(2);
  });

  it('counts the row it lifted out of the way', () => {
    // Everything below the row has already moved up one by the time it lands.
    expect(landingIndex(order, 'd', 'b', 'before')).toBe(1);
    expect(landingIndex(order, 'd', 'b', 'after')).toBe(2);
  });

  it('takes the place of the row it was dropped on when there is no side', () => {
    expect(landingIndex(order, 'a', 'c', null)).toBe(2);
    expect(landingIndex(order, 'd', 'b', null)).toBe(1);
  });

  it('returns nothing when it lands where it was', () => {
    expect(landingIndex(order, 'b', 'b', null)).toBeNull();
    expect(landingIndex(order, 'b', 'c', 'before')).toBeNull();
  });

  it('returns nothing for a row that is not in the list', () => {
    expect(landingIndex(order, 'z', 'c', 'before')).toBeNull();
    expect(landingIndex(order, 'a', 'z', 'before')).toBeNull();
  });
});

describe('reorderRows()', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('moves the row down the list', () => {
    expect(reorderRows(order, 'a', 'c', 'after')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves it up', () => {
    expect(reorderRows(order, 'd', 'b', 'before')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('leaves the list it was given alone', () => {
    reorderRows(order, 'a', 'c', 'after');

    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns nothing when the move changes nothing', () => {
    expect(reorderRows(order, 'b', 'b', null)).toBeNull();
  });
});
