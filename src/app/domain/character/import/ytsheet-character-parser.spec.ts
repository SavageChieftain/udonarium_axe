import { ImportedSection } from '@axe/domain/character/import/imported-character';
import { isYtsheetCharacter, parseYtsheetCharacter } from '@axe/domain/character/import/ytsheet-character-parser';

describe('parseYtsheetCharacter', () => {
  // The shape of the json the sheet service puts out, whose keys are a family, a number and a field.
  const ytsheet = {
    characterName: '只人の戦士',
    sheetURL: 'https://yutorize.work/ytsheet/gs/?id=bUe1JF',
    ver: '1.29.001',
    color: '#446688',
    sheetDescriptionM: '種族:只人 職業:戦士3',
    race: '只人',
    level: '1',
    statusLife: '23',
    statusMove: '21',
    ability1Str: '3',
    weapon1Name: '小剣（ショートソード）',
    weapon1Power: '1d6',
    weapon1Range: '近接',
    skill1Name: '過重行動',
    skill1Grade: '初歩',
    id: 'bUe1JF',
    mode: 'save',
    colorBaseBgH: '0',
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises it by its address and version markers', () => {
    expect(isYtsheetCharacter(ytsheet)).toBe(true);
    expect(isYtsheetCharacter({ characterName: 'X' })).toBe(false);
    expect(isYtsheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes a sheet with no name field by its marker and its alias', () => {
    const ar2e = {
      sheetURL: 'https://yutorize.work/ytsheet/ar2e/?id=i7Crz9',
      ver: '1.29.001',
      aka: '剣の冒険者',
      race: 'ヒューリン',
      skill1Name: 'オールラウンド',
    };
    expect(isYtsheetCharacter(ar2e)).toBe(true);
    const result = parseYtsheetCharacter(ar2e)!;
    expect(result.name).toBe('剣の冒険者');
    expect(result.sections.some((section) => section.label === '技能')).toBe(true);
  });

  it('takes the name, the colour and the summary', () => {
    const result = parseYtsheetCharacter(ytsheet)!;
    expect(result.sourceFormat).toBe('ytsheet');
    expect(result.name).toBe('只人の戦士');
    expect(result.color).toBe('#446688');
    expect(result.memo).toBe('種族:只人 職業:戦士3');
  });

  it('spreads those keys into named sections, the rows by name and the columns by the shared labels', () => {
    const result = parseYtsheetCharacter(ytsheet)!;
    const weapon = findSection(result.sections, '武器')!;
    expect(weapon.groups[0].label).toBe('小剣（ショートソード）');
    expect(weapon.groups[0].fields).toContainEqual({ label: '威力', value: '1d6', kind: 'text' });
    expect(weapon.groups[0].fields).toContainEqual({ label: '射程', value: '近接', kind: 'text' });
    expect(findSection(result.sections, '技能')!.groups[0].label).toBe('過重行動');
  });

  it('puts a scalar with no family into the data section under a shared label, and leaves the internal keys out', () => {
    const result = parseYtsheetCharacter(ytsheet)!;
    const data = findSection(result.sections, 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: '種族', value: '只人', kind: 'text' });
    expect(data.groups[0].fields).toContainEqual({ label: '生命力', value: 23, kind: 'number' });
    expect(data.groups[0].fields.some((field) => field.label === 'id' || field.label === 'colorBaseBgH')).toBe(false);
  });
});
