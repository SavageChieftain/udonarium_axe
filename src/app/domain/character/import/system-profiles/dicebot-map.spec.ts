import { resolveCharasheetDicebot } from '@axe/domain/character/import/system-profiles/dicebot-map';

describe('resolveCharasheetDicebot', () => {
  it('maps each edition onto its dice bot', () => {
    expect(resolveCharasheetDicebot('coc')).toBe('Cthulhu');
    expect(resolveCharasheetDicebot('coc7')).toBe('Cthulhu7th');
  });

  it('forgives case and surrounding spaces', () => {
    expect(resolveCharasheetDicebot(' COC ')).toBe('Cthulhu');
  });

  it('returns nothing for a system it does not support', () => {
    expect(resolveCharasheetDicebot('arianrhod')).toBe('');
    expect(resolveCharasheetDicebot('')).toBe('');
  });
});
