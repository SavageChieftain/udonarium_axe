import { timelineColumns, timelineSpan, toTimelineBars } from '@axe/domain/character/buff-timeline';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';

describe('buff-timeline', () => {
  function makeRoot(): DataElement {
    const root = DataElement.create('バフ', '');
    root.appendChild(DataElement.create('バフ/デバフ', ''));
    return root;
  }

  function addBuff(root: DataElement, name: string, rounds: number, effect = ''): DataElement {
    const buff = DataElement.create(name, rounds, { type: DataElementType.NUMBER_RESOURCE, currentValue: effect });
    root.children[0].appendChild(buff);
    return buff;
  }

  describe('toTimelineBars()', () => {
    it('has nothing to draw for a character with no buffs', () => {
      expect(toTimelineBars(null)).toEqual([]);
      expect(toTimelineBars(makeRoot())).toEqual([]);
    });

    it('puts the longest bar first, so the tail of the chart reads down the left', () => {
      const root = makeRoot();
      addBuff(root, '短い', 1);
      addBuff(root, '長い', 5);
      addBuff(root, '中くらい', 3);

      expect(toTimelineBars(root).map((bar) => bar.name)).toEqual(['長い', '中くらい', '短い']);
    });

    it('carries what the bar has to say about itself', () => {
      const root = makeRoot();
      const buff = addBuff(root, '猛攻撃', 3, '命中+2');
      buff.setAttribute(DataElementAttribute.BUFF_TIMING, 'turnStart');
      buff.setAttribute(DataElementAttribute.BUFF_TRIGGER, '術者');
      buff.setAttribute(DataElementAttribute.BUFF_MOD_TARGET, '命中');
      buff.setAttribute(DataElementAttribute.BUFF_MOD_APPLIED, '2');

      expect(toTimelineBars(root)[0]).toMatchObject({
        name: '猛攻撃',
        effect: '命中+2',
        strength: '+2',
        rounds: 3,
        timing: 'turnStart',
        trigger: '術者',
        modifierTarget: '命中',
      });
    });
  });

  describe('timelineSpan()', () => {
    const row = (rounds: number[]) => ({
      characterIdentifier: 'c',
      characterName: 'コマ',
      imageUrl: '',
      bars: rounds.map((r, i) => ({
        identifier: `b${i}`,
        name: 'バフ',
        effect: '',
        strength: '',
        icon: '✦',
        color: '#000',
        rounds: r,
        timing: 'roundEnd' as const,
        trigger: '',
        modifierTarget: '',
      })),
    });

    it('keeps a nearly empty chart wide enough to read', () => {
      expect(timelineSpan([row([1])])).toBe(4);
      expect(timelineSpan([])).toBe(4);
    });

    it('grows to the longest buff on the table', () => {
      expect(timelineSpan([row([2]), row([7])])).toBe(7);
    });

    it('stops growing before one long buff squeezes out the rest', () => {
      expect(timelineSpan([row([40])])).toBe(12);
    });
  });

  describe('timelineColumns()', () => {
    it('counts from the round being played', () => {
      expect(timelineColumns(3, 4)).toEqual([3, 4, 5, 6]);
    });

    it('starts at the first round before anyone has begun', () => {
      expect(timelineColumns(0, 3)).toEqual([1, 2, 3]);
    });
  });
});
