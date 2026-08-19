import { buffTriggerOptions, selectedTriggerValue } from '@axe/domain/character/buff-trigger-options';

describe('buff-trigger-options', () => {
  const table = [
    { identifier: 'id-a', name: 'クリフトン' },
    { identifier: 'id-b', name: 'アーサー' },
  ];
  const unknown = (name: string) => `${name}（卓外）`;

  describe('buffTriggerOptions()', () => {
    it('offers everyone on the table, by identifier', () => {
      expect(buffTriggerOptions(table, '', unknown)).toEqual([
        { value: 'id-a', label: 'クリフトン' },
        { value: 'id-b', label: 'アーサー' },
      ]);
    });

    it('keeps a trigger belonging to nobody here, so an edit does not drop it', () => {
      // A chat command writes a name, and that name may be somebody who has left the table.
      expect(buffTriggerOptions(table, '名も無き術者', unknown)[0]).toEqual({
        value: '名も無き術者',
        label: '名も無き術者（卓外）',
      });
    });

    it('adds nothing for a trigger the table already answers to', () => {
      expect(buffTriggerOptions(table, 'アーサー', unknown)).toHaveLength(2);
      expect(buffTriggerOptions(table, 'id-a', unknown)).toHaveLength(2);
    });
  });

  describe('selectedTriggerValue()', () => {
    it('picks the identifier out of a trigger written down as a name', () => {
      expect(selectedTriggerValue(table, 'アーサー')).toBe('id-b');
    });

    it('leaves an identifier as it is', () => {
      expect(selectedTriggerValue(table, 'id-a')).toBe('id-a');
    });

    it('selects nobody where no trigger was set', () => {
      expect(selectedTriggerValue(table, '')).toBe('');
    });
  });
});
