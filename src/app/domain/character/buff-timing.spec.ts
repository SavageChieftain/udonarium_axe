import {
  buffTimingOf,
  buffTriggerOf,
  BuffTurnActor,
  isBuffDueAt,
  isBuffTimingToken,
  resolveBuffTiming,
} from '@axe/domain/character/buff-timing';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';

describe('buff-timing', () => {
  const owner: BuffTurnActor = { identifier: 'owner-id', name: '受け手' };
  const caster: BuffTurnActor = { identifier: 'caster-id', name: '術者' };

  function makeBuff(attributes: Record<string, string> = {}): DataElement {
    const element = DataElement.create('猛攻撃', 3, { type: DataElementType.NUMBER_RESOURCE, currentValue: '攻+1' });
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }

  describe('resolveBuffTiming()', () => {
    it('reads the timings written the way a table would say them', () => {
      expect(resolveBuffTiming('ラウンド終了時')).toBe('roundEnd');
      expect(resolveBuffTiming('手番開始')).toBe('turnStart');
      expect(resolveBuffTiming('turnEnd')).toBe('turnEnd');
      expect(resolveBuffTiming('TurnStart')).toBe('turnStart');
    });

    it('says nothing about a word that is not a timing', () => {
      expect(resolveBuffTiming('☠️')).toBeNull();
      expect(isBuffTimingToken('red')).toBe(false);
    });
  });

  describe('buffTimingOf()', () => {
    it('leaves a buff nobody said anything about ending with the round', () => {
      expect(buffTimingOf(makeBuff())).toBe('roundEnd');
    });

    it('falls back to the round for a timing it does not know', () => {
      expect(buffTimingOf(makeBuff({ [DataElementAttribute.BUFF_TIMING]: 'いつか' }))).toBe('roundEnd');
    });
  });

  describe('isBuffDueAt()', () => {
    it('counts a plain buff down at the end of every round', () => {
      const buff = makeBuff();

      expect(isBuffDueAt(buff, 'roundEnd', owner, { identifier: '', name: '' })).toBe(true);
      expect(isBuffDueAt(buff, 'turnStart', owner, owner)).toBe(false);
    });

    it('waits for the bearer where no trigger was named', () => {
      const buff = makeBuff({ [DataElementAttribute.BUFF_TIMING]: 'turnStart' });

      expect(isBuffDueAt(buff, 'turnStart', owner, owner)).toBe(true);
      expect(isBuffDueAt(buff, 'turnStart', owner, caster)).toBe(false);
    });

    it("waits for the caster's turn where the spell says so", () => {
      // Sword World's enhancements run out as their caster comes round again.
      const buff = makeBuff({
        [DataElementAttribute.BUFF_TIMING]: 'turnStart',
        [DataElementAttribute.BUFF_TRIGGER]: 'caster-id',
      });

      expect(isBuffDueAt(buff, 'turnStart', owner, caster)).toBe(true);
      expect(isBuffDueAt(buff, 'turnStart', owner, owner)).toBe(false);
      expect(isBuffDueAt(buff, 'roundEnd', owner, { identifier: '', name: '' })).toBe(false);
    });

    it('takes a trigger written down as a name, which is what a chat command has', () => {
      const buff = makeBuff({
        [DataElementAttribute.BUFF_TIMING]: 'turnEnd',
        [DataElementAttribute.BUFF_TRIGGER]: '術者',
      });

      expect(buffTriggerOf(buff)).toBe('術者');
      expect(isBuffDueAt(buff, 'turnEnd', owner, caster)).toBe(true);
      expect(isBuffDueAt(buff, 'turnEnd', owner, owner)).toBe(false);
    });
  });
});
