import { handHolderOf, handLocationOf, isHandLocation, isHandOf } from '@axe/domain/card/hand-location';
import { describe, expect, it } from 'vitest';

describe('hand-location', () => {
  it('builds the place of a hand from the user', () => {
    expect(handLocationOf('u1')).toBe('hand:u1');
  });

  it('recognises such a place', () => {
    expect(isHandLocation('hand:u1')).toBe(true);
    expect(isHandLocation('table')).toBe(false);
    expect(isHandLocation('graveyard')).toBe(false);
    expect(isHandLocation('common')).toBe(false);
  });

  it('counts a place with no owner as no hand', () => {
    expect(isHandLocation('hand:')).toBe(false);
    expect(handHolderOf('hand:')).toBeNull();
  });

  it('takes the owner out of the place', () => {
    expect(handHolderOf('hand:u1')).toBe('u1');
    expect(handHolderOf('table')).toBeNull();
  });

  it('tells whose hand it is', () => {
    expect(isHandOf('hand:u1', 'u1')).toBe(true);
    expect(isHandOf('hand:u1', 'u2')).toBe(false);
    expect(isHandOf('table', 'u1')).toBe(false);
  });

  it('is nobodys without a user', () => {
    expect(isHandOf('hand:', '')).toBe(false);
    expect(isHandOf('hand:u1', '')).toBe(false);
  });
});

describe('being asked before a room is joined', () => {
  it("says a card is nobody's hand rather than throwing", () => {
    expect(isHandOf('hand:someone', undefined as unknown as string)).toBe(false);
    expect(isHandOf('hand:someone', null as unknown as string)).toBe(false);
    expect(isHandOf('hand:someone', '')).toBe(false);
  });
});
