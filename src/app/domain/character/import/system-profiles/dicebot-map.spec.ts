import { resolveCharasheetDicebot } from '@axe/domain/character/import/system-profiles/dicebot-map';

describe('resolveCharasheetDicebot', () => {
  it('CoC6/CoC7 の game を bcdice のシステムIDへ写像する', () => {
    expect(resolveCharasheetDicebot('coc')).toBe('Cthulhu');
    expect(resolveCharasheetDicebot('coc7')).toBe('Cthulhu7th');
  });

  it('大文字・前後空白を吸収する', () => {
    expect(resolveCharasheetDicebot(' COC ')).toBe('Cthulhu');
  });

  it('未対応の game は空文字を返す', () => {
    expect(resolveCharasheetDicebot('arianrhod')).toBe('');
    expect(resolveCharasheetDicebot('')).toBe('');
  });
});
