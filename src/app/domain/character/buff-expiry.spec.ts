import { formatExpiredBuffs } from '@axe/domain/character/buff-expiry';

describe('formatExpiredBuffs', () => {
  it('キャラクターごとに切れたバフを並べる', () => {
    expect(
      formatExpiredBuffs([
        { characterName: 'クリフトン', buffNames: ['猛攻撃', '加速'] },
        { characterName: 'アーサー', buffNames: ['集中'] },
      ])
    ).toBe('クリフトン: 猛攻撃・加速 / アーサー: 集中');
  });

  it('切れたバフが無いキャラクターは並べない', () => {
    expect(
      formatExpiredBuffs([
        { characterName: 'クリフトン', buffNames: [] },
        { characterName: 'アーサー', buffNames: ['集中'] },
      ])
    ).toBe('アーサー: 集中');
  });

  it('何も切れていなければ空文字を返す', () => {
    expect(formatExpiredBuffs([])).toBe('');
    expect(formatExpiredBuffs([{ characterName: 'クリフトン', buffNames: [] }])).toBe('');
  });
});
