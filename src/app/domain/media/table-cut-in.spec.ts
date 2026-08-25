import {
  encodeCutInIdentifiers,
  parseCutInIdentifiers,
  pickCutInIdentifier,
  rollCutIn,
} from '@axe/domain/media/table-cut-in';

const anything = () => true;
const first = () => 0;

describe('parseCutInIdentifiers()', () => {
  it('reads nothing out of an empty setting', () => {
    expect(parseCutInIdentifiers('')).toEqual([]);
  });

  it('reads a single cut-in', () => {
    expect(parseCutInIdentifiers('cut-1')).toEqual(['cut-1']);
  });

  it('reads several, trimming the spaces around them', () => {
    expect(parseCutInIdentifiers(' cut-1 , cut-2 ,cut-3')).toEqual(['cut-1', 'cut-2', 'cut-3']);
  });

  it('drops the blanks left by a trailing comma', () => {
    expect(parseCutInIdentifiers('cut-1,,cut-2,')).toEqual(['cut-1', 'cut-2']);
  });

  it('keeps one of each', () => {
    expect(parseCutInIdentifiers('cut-1,cut-2,cut-1')).toEqual(['cut-1', 'cut-2']);
  });
});

describe('encodeCutInIdentifiers()', () => {
  it('writes an empty list as an empty setting', () => {
    expect(encodeCutInIdentifiers([])).toBe('');
  });

  it('writes what parsing reads back', () => {
    expect(encodeCutInIdentifiers(['cut-1', 'cut-2'])).toBe('cut-1,cut-2');
  });

  it('drops the blanks and the repeats on the way out', () => {
    expect(encodeCutInIdentifiers(['cut-1', ' ', 'cut-1', 'cut-2'])).toBe('cut-1,cut-2');
  });
});

describe('pickCutInIdentifier()', () => {
  it('draws nothing from an empty list', () => {
    expect(pickCutInIdentifier([], anything, first)).toBeNull();
  });

  it('draws the only one there is without rolling', () => {
    const roll = vi.fn(first);

    expect(pickCutInIdentifier(['cut-1'], anything, roll)).toBe('cut-1');
    expect(roll).not.toHaveBeenCalled();
  });

  it('draws the one the roll names', () => {
    expect(pickCutInIdentifier(['cut-1', 'cut-2', 'cut-3'], anything, () => 2)).toBe('cut-3');
  });

  it('leaves out the cut-ins that are gone', () => {
    const remaining = (identifier: string) => identifier !== 'cut-1';

    expect(pickCutInIdentifier(['cut-1', 'cut-2'], remaining, first)).toBe('cut-2');
  });

  it('draws nothing once every cut-in named is gone', () => {
    expect(pickCutInIdentifier(['cut-1', 'cut-2'], () => false, first)).toBeNull();
  });

  it('stays inside the list when the roll overshoots', () => {
    expect(pickCutInIdentifier(['cut-1', 'cut-2'], anything, () => 9)).toBe('cut-2');
    expect(pickCutInIdentifier(['cut-1', 'cut-2'], anything, () => -3)).toBe('cut-1');
  });
});

describe('rollCutIn()', () => {
  it('lands inside the count', () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const rolled = rollCutIn(3);
      expect(rolled).toBeGreaterThanOrEqual(0);
      expect(rolled).toBeLessThan(3);
    }
  });
});
