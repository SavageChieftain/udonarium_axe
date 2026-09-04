import { Hotbar } from '@axe/domain/hotbar/hotbar';
import { emptyHotbarSlotDraft, HotbarSlotDraft } from '@axe/domain/hotbar/hotbar-draft';
import { HOTBAR_PAGES, HOTBAR_SLOTS_PER_PAGE } from '@axe/domain/hotbar/hotbar-size';
import { HotbarSlot } from '@axe/domain/hotbar/hotbar-slot';

describe('Hotbar', () => {
  let hotbar: Hotbar;

  function draft(value: string): HotbarSlotDraft {
    const held = emptyHotbarSlotDraft('chat');
    held.value = value;
    return held;
  }

  beforeEach(() => {
    hotbar = new Hotbar();
    hotbar.initialize();
  });

  it('opens with every slot empty, and keeps no object for one', () => {
    expect(hotbar.slots).toEqual([]);
    expect(hotbar.slotAt(0, 0)).toBeNull();
  });

  it('fills a slot and finds it again by where it sits', () => {
    const slot = hotbar.put(2, 7, draft('2d6+3'));

    expect(slot).toBeInstanceOf(HotbarSlot);
    expect(hotbar.slotAt(2, 7)?.argument).toBe('2d6+3');
    expect(hotbar.slots).toHaveLength(1);
  });

  it('writes over a slot rather than laying a second one on it', () => {
    hotbar.put(0, 0, draft('first'));
    hotbar.put(0, 0, draft('second'));

    expect(hotbar.slots).toHaveLength(1);
    expect(hotbar.slotAt(0, 0)?.argument).toBe('second');
  });

  it('refuses a place it does not have', () => {
    expect(hotbar.put(HOTBAR_PAGES, 0, draft('off the end'))).toBeNull();
    expect(hotbar.put(0, HOTBAR_SLOTS_PER_PAGE, draft('off the end'))).toBeNull();
    expect(hotbar.put(-1, 0, draft('before the start'))).toBeNull();
    expect(hotbar.slots).toEqual([]);
  });

  it('keeps the pages apart', () => {
    hotbar.put(0, 3, draft('on the first page'));
    hotbar.put(4, 3, draft('on the last page'));

    expect(hotbar.slotsOn(0).map((slot) => slot.argument)).toEqual(['on the first page']);
    expect(hotbar.slotsOn(4).map((slot) => slot.argument)).toEqual(['on the last page']);
    expect(hotbar.slotsOn(2)).toEqual([]);
  });

  it('empties a slot, and says nothing was there when there was not', () => {
    hotbar.put(1, 1, draft('to be cleared'));

    expect(hotbar.clear(1, 1)).toBeInstanceOf(HotbarSlot);
    expect(hotbar.slotAt(1, 1)).toBeNull();
    expect(hotbar.clear(1, 1)).toBeNull();
  });

  it('moves a slot into an empty place', () => {
    hotbar.put(0, 0, draft('travelling'));

    expect(hotbar.move({ page: 0, slotIndex: 0 }, { page: 3, slotIndex: 9 })).toBe(true);
    expect(hotbar.slotAt(0, 0)).toBeNull();
    expect(hotbar.slotAt(3, 9)?.argument).toBe('travelling');
  });

  it('swaps two slots when the place is taken', () => {
    hotbar.put(0, 0, draft('left'));
    hotbar.put(0, 1, draft('right'));

    hotbar.move({ page: 0, slotIndex: 0 }, { page: 0, slotIndex: 1 });

    expect(hotbar.slotAt(0, 0)?.argument).toBe('right');
    expect(hotbar.slotAt(0, 1)?.argument).toBe('left');
    expect(hotbar.slots).toHaveLength(2);
  });

  it('will not move a slot that is not there, nor off the end', () => {
    hotbar.put(0, 0, draft('here'));

    expect(hotbar.move({ page: 2, slotIndex: 2 }, { page: 0, slotIndex: 1 })).toBe(false);
    expect(hotbar.move({ page: 0, slotIndex: 0 }, { page: 0, slotIndex: HOTBAR_SLOTS_PER_PAGE })).toBe(false);
    expect(hotbar.slotAt(0, 0)?.argument).toBe('here');
  });

  it('holds its own place among the children, whatever a slot is numbered', () => {
    hotbar.put(0, 9, draft('ninth'));
    hotbar.put(0, 0, draft('first'));

    expect(hotbar.children.map((child) => (child as HotbarSlot).argument)).toEqual(['ninth', 'first']);
  });
});
