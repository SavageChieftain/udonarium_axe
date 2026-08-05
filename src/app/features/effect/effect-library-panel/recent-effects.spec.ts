import { pushRecentEffect, readRecentEffects } from '@axe/features/effect/effect-library-panel/recent-effects';

describe('直近に使ったエフェクト', () => {
  function makeStorage(initial: Record<string, string> = {}): Storage {
    const data = new Map(Object.entries(initial));
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
      clear: () => data.clear(),
      key: () => null,
      get length() {
        return data.size;
      },
    } as Storage;
  }

  it('新しく使ったものを先頭へ積むこと', () => {
    const storage = makeStorage();

    pushRecentEffect(storage, 'a');
    pushRecentEffect(storage, 'b');

    expect(readRecentEffects(storage)).toEqual(['b', 'a']);
  });

  it('同じものを重ねず先頭へ移すこと', () => {
    const storage = makeStorage();

    pushRecentEffect(storage, 'a');
    pushRecentEffect(storage, 'b');
    pushRecentEffect(storage, 'a');

    expect(readRecentEffects(storage)).toEqual(['a', 'b']);
  });

  it('8 件までに切り詰めること', () => {
    const storage = makeStorage();

    for (let index = 0; index < 12; index++) pushRecentEffect(storage, `e${index}`);

    expect(readRecentEffects(storage)).toHaveLength(8);
    expect(readRecentEffects(storage)[0]).toBe('e11');
  });

  it('保存が無い・壊れていても空で返すこと', () => {
    expect(readRecentEffects(null)).toEqual([]);
    expect(readRecentEffects(makeStorage({ 'axe.effect.recent': '{' }))).toEqual([]);
    expect(readRecentEffects(makeStorage({ 'axe.effect.recent': '{"a":1}' }))).toEqual([]);
  });

  it('保存できなくても一覧を返すこと', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    } as unknown as Storage;

    expect(pushRecentEffect(storage, 'a')).toEqual(['a']);
  });
});
