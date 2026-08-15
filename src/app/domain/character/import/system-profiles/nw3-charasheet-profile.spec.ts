import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildNw3CharasheetCharacter,
  isNw3CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/nw3-charasheet-profile';

describe('buildNw3CharasheetCharacter', () => {
  // built from real data of one system at the archive
  const nw3 = {
    pc_name: 'シノ',
    game: 'nw3',
    level: '1',
    class1_name: '魔鎧使い',
    class2_name: '箒人',
    S1: '4',
    S2: '4',
    S3: '3',
    S4: '2',
    S5: '2',
    S6: '3',
    S7: '3',
    S8: '2',
    effect_name: ['カバーリング', '魔鎧所持'],
    effect_timing: ['DR直前', '常時'],
    effect_shozoku: ['魔鎧使い', '魔鎧使い'],
    arms_name: ['サンダーショット'],
    arms_range: ['近距離'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises the system', () => {
    expect(isNw3CharasheetCharacter(nw3)).toBe(true);
    expect(isNw3CharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes its eight abilities and the dice bot', () => {
    const result = buildNw3CharasheetCharacter(nw3)!;
    expect(result.dicebot).toBe('NightWizard3rd');
    expect(result.params).toEqual([
      { label: '筋力', value: '4' },
      { label: '器用', value: '4' },
      { label: '感覚', value: '3' },
      { label: '理知', value: '2' },
      { label: '意思', value: '2' },
      { label: '幸運', value: '3' },
      { label: '耐久', value: '3' },
      { label: '魔法', value: '2' },
    ]);
  });

  it('spreads the talents and the weapons with their names', () => {
    const result = buildNw3CharasheetCharacter(nw3)!;
    expect(findSection(result.sections, '特技')!.groups.map((group) => group.label)).toEqual([
      'カバーリング',
      '魔鎧所持',
    ]);
    expect(findSection(result.sections, '武器')!.groups[0].label).toBe('サンダーショット');
  });

  it('builds the roll of that system into the palette', () => {
    const result = buildNw3CharasheetCharacter(nw3)!;
    expect(result.commands).toContain('4NW 【筋力】');
    expect(result.commands).toContain('2NW 【魔法】');
  });
});
