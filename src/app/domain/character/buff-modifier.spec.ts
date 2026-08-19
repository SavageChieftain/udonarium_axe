import {
  clearBuffModifier,
  describeBuffModifier,
  parseBuffModifierRequest,
  readBuffModifier,
  writeBuffModifier,
} from '@axe/domain/character/buff-modifier';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';

describe('buff-modifier', () => {
  function makeBuff(): DataElement {
    return DataElement.create('猛攻撃', 3, { type: DataElementType.NUMBER_RESOURCE, currentValue: '' });
  }

  describe('parseBuffModifierRequest()', () => {
    it('reads a status, an operator and an amount', () => {
      expect(parseBuffModifierRequest('命中', '+', '2')).toEqual({
        target: '命中',
        slot: 'now',
        operator: 'add',
        amount: 2,
      });
    });

    it('turns a subtraction into a move in the other direction', () => {
      expect(parseBuffModifierRequest('回避', '-', '1')?.amount).toBe(-1);
    });

    it('takes the full-width operators a Japanese keyboard produces', () => {
      expect(parseBuffModifierRequest('命中', '＋', '２'.normalize('NFKC'))?.amount).toBe(2);
      expect(parseBuffModifierRequest('命中', '－', '1')?.amount).toBe(-1);
    });

    it('reads a caret as the far side of a resource', () => {
      expect(parseBuffModifierRequest('HP^', '+', '5')).toMatchObject({ target: 'HP', slot: 'max' });
    });

    it('holds a status at a value where it is told to', () => {
      expect(parseBuffModifierRequest('防護点', '=', '10')).toMatchObject({ operator: 'set', amount: 10 });
    });

    it('refuses what it cannot read', () => {
      expect(parseBuffModifierRequest('', '+', '2')).toBeNull();
      expect(parseBuffModifierRequest('命中', '?', '2')).toBeNull();
      expect(parseBuffModifierRequest('命中', '+', 'たくさん')).toBeNull();
    });
  });

  describe('describeBuffModifier()', () => {
    it('writes the effect the way a sheet would', () => {
      expect(describeBuffModifier(parseBuffModifierRequest('命中', '+', '2')!)).toBe('命中+2');
      expect(describeBuffModifier(parseBuffModifierRequest('回避', '-', '1')!)).toBe('回避-1');
      expect(describeBuffModifier(parseBuffModifierRequest('HP^', '+', '5')!)).toBe('最大HP+5');
      expect(describeBuffModifier(parseBuffModifierRequest('防護点', '=', '10')!)).toBe('防護点=10');
    });
  });

  describe('reading it back', () => {
    it('keeps how far the status moved, which is what puts it back', () => {
      const buff = makeBuff();
      writeBuffModifier(buff, { target: '命中', slot: 'now', operator: 'add', applied: 2 });

      expect(readBuffModifier(buff)).toEqual({ target: '命中', slot: 'now', operator: 'add', applied: 2 });

      clearBuffModifier(buff);
      expect(readBuffModifier(buff)).toBeNull();
    });

    it('says nothing for a buff that moves no status', () => {
      expect(readBuffModifier(makeBuff())).toBeNull();
    });
  });
});
