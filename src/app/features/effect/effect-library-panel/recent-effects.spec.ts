import { pushRecentEffect, readRecentEffects } from '@axe/features/effect/effect-library-panel/recent-effects';

describe('the effects used lately', () => {
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

  it('puts what was just used at the front', () => {
    const storage = makeStorage();

    pushRecentEffect(storage, 'a');
    pushRecentEffect(storage, 'b');

    expect(readRecentEffects(storage)).toEqual(['b', 'a']);
  });

  it('moves a repeat to the front rather than adding it again', () => {
    const storage = makeStorage();

    pushRecentEffect(storage, 'a');
    pushRecentEffect(storage, 'b');
    pushRecentEffect(storage, 'a');

    expect(readRecentEffects(storage)).toEqual(['a', 'b']);
  });

  it('keeps no more than eight', () => {
    const storage = makeStorage();

    for (let index = 0; index < 12; index++) pushRecentEffect(storage, `e${index}`);

    expect(readRecentEffects(storage)).toHaveLength(8);
    expect(readRecentEffects(storage)[0]).toBe('e11');
  });

  it('comes back empty when nothing was saved or what was saved is broken', () => {
    expect(readRecentEffects(null)).toEqual([]);
    expect(readRecentEffects(makeStorage({ 'axe.effect.recent': '{' }))).toEqual([]);
    expect(readRecentEffects(makeStorage({ 'axe.effect.recent': '{"a":1}' }))).toEqual([]);
  });

  it('returns the list even when it cannot save', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    } as unknown as Storage;

    expect(pushRecentEffect(storage, 'a')).toEqual(['a']);
  });
});
