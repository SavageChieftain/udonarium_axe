import { hotbarSlotTag } from '@axe/domain/hotbar/hotbar-tag';

describe('the mark a slot leaves on what it lays out', () => {
  it('tells one slot from another, and one reader from another', () => {
    const first = hotbarSlotTag('me', { page: 0, slotIndex: 1 }, 'character-1');

    expect(hotbarSlotTag('me', { page: 0, slotIndex: 2 }, 'character-1')).not.toBe(first);
    expect(hotbarSlotTag('me', { page: 1, slotIndex: 1 }, 'character-1')).not.toBe(first);
    expect(hotbarSlotTag('someone-else', { page: 0, slotIndex: 1 }, 'character-1')).not.toBe(first);
    expect(hotbarSlotTag('me', { page: 0, slotIndex: 1 }, 'character-2')).not.toBe(first);
  });

  it('reads the same for the same slot acting as the same piece', () => {
    expect(hotbarSlotTag('me', { page: 2, slotIndex: 3 }, 'character-1')).toBe(
      hotbarSlotTag('me', { page: 2, slotIndex: 3 }, 'character-1')
    );
  });
});
