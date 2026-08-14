import { formatTrumpCardCode, parseTrumpCardCode } from '@axe/features/card/card-stack-card-list/trump-card-label';

describe('parseTrumpCardCode', () => {
  it('breaks a numbered card into its suit, its rank and its colour', () => {
    expect(parseTrumpCardCode('c01')).toEqual({ suit: '♣', rank: '1', suitColor: 'black' });
    expect(parseTrumpCardCode('s10')).toEqual({ suit: '♠', rank: '10', suitColor: 'black' });
    expect(parseTrumpCardCode('h05')).toEqual({ suit: '♥', rank: '5', suitColor: 'red' });
    expect(parseTrumpCardCode('d07')).toEqual({ suit: '♦', rank: '7', suitColor: 'red' });
  });

  it('names the court cards', () => {
    expect(parseTrumpCardCode('c11')).toEqual({ suit: '♣', rank: 'Jack', suitColor: 'black' });
    expect(parseTrumpCardCode('d12')).toEqual({ suit: '♦', rank: 'Queen', suitColor: 'red' });
    expect(parseTrumpCardCode('h13')).toEqual({ suit: '♥', rank: 'King', suitColor: 'red' });
    expect(parseTrumpCardCode('s13')).toEqual({ suit: '♠', rank: 'King', suitColor: 'black' });
  });

  it('gives a joker its number and no colour', () => {
    expect(parseTrumpCardCode('x01')).toEqual({ suit: '🃏', rank: '1', suitColor: 'none' });
    expect(parseTrumpCardCode('x02')).toEqual({ suit: '🃏', rank: '2', suitColor: 'none' });
  });

  it('returns nothing for a code that is not a playing card', () => {
    expect(parseTrumpCardCode('z02')).toBeNull();
    expect(parseTrumpCardCode('foo')).toBeNull();
    expect(parseTrumpCardCode('')).toBeNull();
    expect(parseTrumpCardCode('c00')).toBeNull();
    expect(parseTrumpCardCode('c14')).toBeNull();
    expect(parseTrumpCardCode('a01')).toBeNull();
  });
});

describe('formatTrumpCardCode', () => {
  it('joins the suit and the rank into a label', () => {
    expect(formatTrumpCardCode('c01')).toBe('♣1');
    expect(formatTrumpCardCode('h13')).toBe('♥King');
    expect(formatTrumpCardCode('x01')).toBe('🃏1');
  });

  it('returns nothing for a code that is not a playing card', () => {
    expect(formatTrumpCardCode('z02')).toBeNull();
    expect(formatTrumpCardCode('foo')).toBeNull();
  });
});
