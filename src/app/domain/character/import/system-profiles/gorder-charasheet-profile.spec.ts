import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildGorderCharasheetCharacter,
  isGorderCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/gorder-charasheet-profile';

describe('buildGorderCharasheetCharacter', () => {
  // built from real data of one system at the archive
  const gorder = {
    pc_name: 'ナナセ',
    game: 'gorder',
    main_class: 'ソルジャー',
    NK1: '16',
    NK2: '10',
    NK3: '13',
    NK4: '16',
    NK5: '12',
    NB1: '80',
    NB2: '50',
    NB3: '65',
    NB4: '80',
    NB5: '60',
    // its twenty fixed skills, with the chance of success and the critical value, in order
    TBAP: [
      '100',
      '50',
      '225',
      '30',
      '30',
      '80',
      '48',
      '40',
      '48',
      '40',
      '30',
      '10',
      '30',
      '20',
      '70',
      '50',
      '30',
      '39',
      '30',
      '100',
      '10',
    ],
    TBAC: [
      '20',
      '10',
      '45',
      '6',
      '6',
      '16',
      '9',
      '8',
      '9',
      '8',
      '6',
      '2',
      '6',
      '4',
      '14',
      '10',
      '6',
      '7',
      '6',
      '20',
      '2',
    ],
    ability_name: ['調達', '近接習熟'],
    ability_memo: ['物品を手に入れる', ''],
    implant_name: ['強化義眼'],
    implant_dest: ['頭部'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises the system', () => {
    expect(isGorderCharasheetCharacter(gorder)).toBe(true);
    expect(isGorderCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes its five abilities and the dice bot', () => {
    const result = buildGorderCharasheetCharacter(gorder)!;
    expect(result.dicebot).toBe('GardenOrder');
    expect(result.params).toEqual([
      { label: '身体', value: '16' },
      { label: '感覚', value: '10' },
      { label: '知力', value: '13' },
      { label: '意志', value: '16' },
      { label: '魅力', value: '12' },
    ]);
  });

  it('spreads the fixed skills under the names its own page gives, with their chances', () => {
    const result = buildGorderCharasheetCharacter(gorder)!;
    const skills = findSection(result.sections, '技能')!;
    const gun = skills.groups.find((group) => group.label === '銃器')!;
    expect(gun.fields).toContainEqual({ label: '成功率', value: 225, kind: 'number' });
    expect(skills.groups.find((group) => group.label === '当て身')).toBeDefined();
    expect(skills.groups.find((group) => group.label === '特殊機械操作')).toBeDefined();
  });

  it('spreads the talents and the implants with their names', () => {
    const result = buildGorderCharasheetCharacter(gorder)!;
    expect(findSection(result.sections, '特技')!.groups.map((group) => group.label)).toEqual(['調達', '近接習熟']);
    expect(findSection(result.sections, 'インプラント')!.groups[0].label).toBe('強化義眼');
  });

  it('builds the ability and skill rolls of that system into the palette', () => {
    const result = buildGorderCharasheetCharacter(gorder)!;
    expect(result.commands).toContain('GO80 【身体】');
    expect(result.commands).toContain('GO225 【銃器】');
  });
});
