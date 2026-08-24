import { turnCache } from '@axe/core/util/turn-cache';

describe('turnCache()', () => {
  it('works the answer out once, however often it is asked in one turn', () => {
    let made = 0;
    const held = turnCache(() => ++made);

    expect(held()).toBe(1);
    expect(held()).toBe(1);
    expect(held()).toBe(1);
    expect(made).toBe(1);
  });

  it('lets it go at the end of the turn, so the next one starts fresh', async () => {
    let made = 0;
    const held = turnCache(() => ++made);

    held();
    await Promise.resolve();

    expect(held()).toBe(2);
  });

  it('keeps each one to itself', () => {
    const first = turnCache(() => 'a');
    const second = turnCache(() => 'b');

    expect(first()).toBe('a');
    expect(second()).toBe('b');
  });
});
