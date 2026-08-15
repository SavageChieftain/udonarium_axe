import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildElysionCharasheetCharacter,
  isElysionCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/elysion-charasheet-profile';

describe('buildElysionCharasheetCharacter', () => {
  // built from real data of one system at the archive
  const elysion = {
    pc_name: 'マリ',
    game: 'elysion',
    NB1: '2',
    NB2: '3',
    NB3: '5',
    Power_name: ['生存訓練', '変化の術'],
    Power_Level: ['1', '1'],
    Power_hantei: ['0', '2'],
    Power_cost: ['', '1'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises the system', () => {
    expect(isElysionCharasheetCharacter(elysion)).toBe(true);
    expect(isElysionCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes its three abilities and the dice bot', () => {
    const result = buildElysionCharasheetCharacter(elysion)!;
    expect(result.dicebot).toBe('Elysion');
    expect(result.params).toEqual([
      { label: '学力', value: '2' },
      { label: '青春力', value: '3' },
      { label: '政治力', value: '5' },
    ]);
  });

  it('spreads the skills with their names and reads each ability code through the map taken from the page', () => {
    const result = buildElysionCharasheetCharacter(elysion)!;
    const skills = findSection(result.sections, 'スキル')!;
    expect(skills.groups.map((group) => group.label)).toEqual(['生存訓練', '変化の術']);
    // one code names an ability, and no code leaves the field off
    expect(skills.groups[1].fields).toContainEqual({ label: '能力', value: '青春力', kind: 'text' });
    expect(skills.groups[0].fields.some((field) => field.label === '能力')).toBe(false);
  });

  it('builds the roll of that system into the palette', () => {
    const result = buildElysionCharasheetCharacter(elysion)!;
    expect(result.commands).toContain('EL2 【学力判定】');
    expect(result.commands).toContain('EL5 【政治力判定】');
  });
});
