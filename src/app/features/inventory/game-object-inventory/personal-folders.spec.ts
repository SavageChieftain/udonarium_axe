import {
  readPersonalFolders,
  writePersonalFolders,
} from '@axe/features/inventory/game-object-inventory/personal-folders';

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  } as unknown as Storage;
}

describe('readPersonalFolders()', () => {
  it('finds none where nothing is stored', () => {
    expect(readPersonalFolders(fakeStorage())).toEqual([]);
  });

  it('finds none where there is nowhere to store them', () => {
    expect(readPersonalFolders(null)).toEqual([]);
  });

  it('reads back what was written', () => {
    const storage = fakeStorage();

    writePersonalFolders(storage, ['第1話', '第1話/洞窟']);

    expect(readPersonalFolders(storage)).toEqual(['第1話', '第1話/洞窟']);
  });

  it('ignores stored rubbish rather than throwing', () => {
    expect(readPersonalFolders(fakeStorage({ 'axe.inventory.personal-folders': '{oops' }))).toEqual([]);
  });

  it('ignores anything stored that is not a folder', () => {
    expect(readPersonalFolders(fakeStorage({ 'axe.inventory.personal-folders': '["第1話", 3, "", null]' }))).toEqual([
      '第1話',
    ]);
  });
});

describe('writePersonalFolders()', () => {
  it('has nowhere to write and carries on', () => {
    expect(() => writePersonalFolders(null, ['第1話'])).not.toThrow();
  });

  it('carries on when the browser refuses to store', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    } as unknown as Storage;

    expect(() => writePersonalFolders(storage, ['第1話'])).not.toThrow();
  });
});
