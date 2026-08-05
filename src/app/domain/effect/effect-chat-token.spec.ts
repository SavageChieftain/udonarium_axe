import {
  buildEffectChatToken,
  parseEffectChatToken,
  stripEffectChatTokens,
} from '@axe/domain/effect/effect-chat-token';

describe('parseEffectChatToken()', () => {
  it('演出トークンを取り出すこと', () => {
    expect(parseEffectChatToken('2d6+3 t:HP-10 《爆炎》')).toEqual({ name: '爆炎', text: '2d6+3 t:HP-10' });
  });

  it('トークンが無ければ null を返すこと', () => {
    expect(parseEffectChatToken('2d6+3 t:HP-10')).toBeNull();
  });

  it('中身が空なら無視すること', () => {
    expect(parseEffectChatToken('攻撃《》')).toBeNull();
    expect(parseEffectChatToken('攻撃《 》')).toBeNull();
  });

  it('前後の空白を落とすこと', () => {
    expect(parseEffectChatToken('《 爆炎 》')?.name).toBe('爆炎');
  });

  it('文中に書いても拾うこと', () => {
    expect(parseEffectChatToken('《斬撃》 で斬りかかる')).toEqual({ name: '斬撃', text: 'で斬りかかる' });
  });
});

describe('stripEffectChatTokens()', () => {
  it('トークンを全部取り除くこと', () => {
    expect(stripEffectChatTokens('攻撃《斬撃》と《爆炎》')).toBe('攻撃と');
  });

  it('ダイス式やリソース操作を壊さないこと', () => {
    // 二重山括弧だけを見るので、既存の記法とは衝突しない。
    expect(stripEffectChatTokens('2d6+3 t:HP-10 s:MP-2')).toBe('2d6+3 t:HP-10 s:MP-2');
  });
});

describe('buildEffectChatToken()', () => {
  it('パレットへ貼れる形にすること', () => {
    expect(buildEffectChatToken('爆炎')).toBe('《爆炎》');
    expect(parseEffectChatToken(buildEffectChatToken('爆炎'))?.name).toBe('爆炎');
  });
});
