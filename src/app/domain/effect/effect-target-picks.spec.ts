import { effectPickOrder, reachedEffectPickLimit, toggleEffectPick } from '@axe/domain/effect/effect-target-picks';

describe('toggleEffectPick()', () => {
  it('選んだ順に足すこと', () => {
    let picks = toggleEffectPick([], 'a', 3);
    picks = toggleEffectPick(picks, 'b', 3);
    picks = toggleEffectPick(picks, 'c', 3);

    expect(picks).toEqual(['a', 'b', 'c']);
  });

  it('選び直しで外すこと', () => {
    const picks = toggleEffectPick(['a', 'b', 'c'], 'b', 3);

    // 抜けたあとも残りの順番は保つ。
    expect(picks).toEqual(['a', 'c']);
  });

  it('上限に達したら古いほうから押し出すこと', () => {
    expect(toggleEffectPick(['a', 'b'], 'c', 2)).toEqual(['b', 'c']);
    // 単体対象は「選び直し」として振る舞う。
    expect(toggleEffectPick(['a'], 'b', 1)).toEqual(['b']);
  });

  it('空の識別子を無視すること', () => {
    expect(toggleEffectPick(['a'], '', 3)).toEqual(['a']);
  });
});

describe('effectPickOrder()', () => {
  it('1 始まりの順番を返し、未選択は 0 になること', () => {
    expect(effectPickOrder(['a', 'b'], 'a')).toBe(1);
    expect(effectPickOrder(['a', 'b'], 'b')).toBe(2);
    expect(effectPickOrder(['a', 'b'], 'c')).toBe(0);
  });
});

describe('reachedEffectPickLimit()', () => {
  it('上限に届いた瞬間だけ真を返すこと', () => {
    expect(reachedEffectPickLimit(['a'], ['a', 'b'], 2)).toBe(true);
    expect(reachedEffectPickLimit([], ['a'], 1)).toBe(true);
  });

  it('はじめから埋まっている選び直しでは真を返さないこと', () => {
    // 前の指定を引き継いだ状態で選び直しただけなら、意図せず発動させない。
    expect(reachedEffectPickLimit(['a', 'b'], ['b', 'c'], 2)).toBe(false);
    expect(reachedEffectPickLimit(['a'], ['b'], 1)).toBe(false);
  });

  it('外したときは真を返さないこと', () => {
    expect(reachedEffectPickLimit(['a', 'b'], ['a'], 2)).toBe(false);
  });
});
