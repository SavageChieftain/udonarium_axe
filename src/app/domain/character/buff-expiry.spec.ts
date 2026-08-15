import { formatExpiredBuffs } from '@axe/domain/character/buff-expiry';

describe('formatExpiredBuffs', () => {
  it('lists the buffs that ran out, character by character', () => {
    expect(
      formatExpiredBuffs([
        { characterName: 'クリフトン', buffNames: ['猛攻撃', '加速'] },
        { characterName: 'アーサー', buffNames: ['集中'] },
      ])
    ).toBe('クリフトン: 猛攻撃・加速 / アーサー: 集中');
  });

  it('leaves out a character who lost none', () => {
    expect(
      formatExpiredBuffs([
        { characterName: 'クリフトン', buffNames: [] },
        { characterName: 'アーサー', buffNames: ['集中'] },
      ])
    ).toBe('アーサー: 集中');
  });

  it('returns nothing when none ran out', () => {
    expect(formatExpiredBuffs([])).toBe('');
    expect(formatExpiredBuffs([{ characterName: 'クリフトン', buffNames: [] }])).toBe('');
  });
});
