import { parseCharasheetCharacter } from '@axe/domain/character/import/charasheet-character-parser';
import { ImportedSection } from '@axe/domain/character/import/imported-character';

describe('parseCharasheetCharacter', () => {
  // built from real data of one system at the sheet archive
  const coc = {
    pc_name: 'すー',
    game: 'coc',
    color: '#2266aa',
    pc_making_environ: '作成メモ',
    NA1: 10,
    NA2: 8,
    NA3: 12,
    NA4: 13,
    NA5: 15,
    NA6: 12,
    NA7: 10,
    NA8: 13,
    NA9: 10,
    NA10: 12,
    SAN_Left: '',
    SAN_Max: 99,
    SAN_Danger: 0,
    TS_Total: 260,
    TBAD: ['26', '25', '', ''],
    TBAP: ['26', '', '', ''],
    TBAS: ['', '', '', ''],
    TKAD: ['5', '1', '10'],
    TKAP: ['60', '', '20'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises a character from the archive', () => {
    expect(parseCharasheetCharacter(coc)).not.toBeNull();
    expect(parseCharasheetCharacter({ kind: 'character' })).toBeNull();
  });

  it('takes the name, the colour and the notes', () => {
    const result = parseCharasheetCharacter(coc)!;
    expect(result.sourceFormat).toBe('charasheet');
    expect(result.name).toBe('すー');
    expect(result.color).toBe('#2266aa');
    expect(result.memo).toBe('作成メモ');
  });

  it('reads the numbered abilities of that system into their proper names', () => {
    const result = parseCharasheetCharacter(coc)!;
    expect(result.params).toContainEqual({ label: 'STR', value: '10' });
    expect(result.params).toContainEqual({ label: 'CON', value: '8' });
    expect(result.params).toContainEqual({ label: 'EDU', value: '13' });
    expect(result.params).toContainEqual({ label: 'HP', value: '10' });
  });

  it('takes sanity as a resource, filling an empty current value in from the maximum', () => {
    const result = parseCharasheetCharacter(coc)!;
    expect(result.statuses).toContainEqual({ label: '正気度', value: 99, max: 99 });
  });

  it('spreads the parallel skill arrays into a section per prefix, a row per index', () => {
    const result = parseCharasheetCharacter(coc)!;
    const battle = findSection(result.sections, '戦闘技能')!;
    expect(battle).toBeTruthy();
    // the first row carries values whose column names come from the map of that system
    expect(battle.groups[0].fields).toContainEqual({ label: '初期値', value: 26, kind: 'number' });
    expect(battle.groups[0].fields).toContainEqual({ label: '合計', value: 26, kind: 'number' });
    // a row empty in every column is passed over
    expect(battle.groups.length).toBe(2);

    const know = findSection(result.sections, '知識技能')!;
    expect(know.groups.length).toBe(3);
  });

  it('a scalar that is not an ability stays in the data section', () => {
    const result = parseCharasheetCharacter(coc)!;
    const data = findSection(result.sections, 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: 'TS_Total', value: 260, kind: 'number' });
    // an ability already mapped does not appear there twice
    expect(data.groups[0].fields.some((field) => field.label === 'NA1')).toBe(false);
  });

  it('keeps the data and the arrays of another system, without mapping its abilities', () => {
    const other = { pc_name: 'X', game: 'arianrhod', skillName: ['剣', '盾'], NA1: 99 };
    const result = parseCharasheetCharacter(other)!;
    expect(result.params).toEqual([]);
    const data = findSection(result.sections, 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: 'NA1', value: 99, kind: 'number' });
    expect(result.sections.some((section) => section.label === 'skillName')).toBe(true);
  });

  it('replaces the positional keys with the labels of the page when it is given them', () => {
    const other = { pc_name: 'X', game: 'somesystem', S1: '4', S2: '3' };
    const result = parseCharasheetCharacter(other, { S1: '筋力', S2: '器用' })!;
    const data = findSection(result.sections, 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: '筋力', value: 4, kind: 'number' });
    expect(data.groups[0].fields).toContainEqual({ label: '器用', value: 3, kind: 'number' });
  });

  it('spreads an array family that carries its own names into a section of named rows and columns', () => {
    const other = {
      pc_name: 'リーフ',
      game: 'somesystem',
      skill_name: ['ファイアボルト', '応急手当', ''],
      skill_timing: ['メジャー', 'マイナー', ''],
      skill_hantei: ['知力', '感覚', ''],
      skill_id: ['1', '2', ''],
      item_name: ['杖'],
      item_price: ['100'],
    };
    const result = parseCharasheetCharacter(other)!;
    const skill = findSection(result.sections, '技能')!;
    // the rows are named rather than numbered, the columns come from the suffixes, and the empty rows and internal keys are left out
    expect(skill.groups.map((group) => group.label)).toEqual(['ファイアボルト', '応急手当']);
    expect(skill.groups[0].fields).toContainEqual({ label: 'タイミング', value: 'メジャー', kind: 'text' });
    expect(skill.groups[0].fields).toContainEqual({ label: '判定', value: '知力', kind: 'text' });
    expect(skill.groups[0].fields.some((field) => field.label === 'id' || field.label === 'skill_id')).toBe(false);
    expect(findSection(result.sections, '所持品')!.groups[0].label).toBe('杖');
  });
});
