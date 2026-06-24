import { ImportedSection } from '@axe/domain/character/import/imported-character';
import { isYtsheetCharacter, parseYtsheetCharacter } from '@axe/domain/character/import/ytsheet-character-parser';

describe('parseYtsheetCharacter', () => {
  // ゆとシート（yutorize）の mode=json 出力に即した構造。キーは {family}{連番}{Field}。
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

  it('ゆとシート JSON を判別する（sheetURL/ver マーカー）', () => {
    expect(isYtsheetCharacter(ytsheet)).toBe(true);
    expect(isYtsheetCharacter({ characterName: 'X' })).toBe(false);
    expect(isYtsheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('名前・色・要約メモを取り込む', () => {
    const result = parseYtsheetCharacter(ytsheet)!;
    expect(result.sourceFormat).toBe('ytsheet');
    expect(result.name).toBe('只人の戦士');
    expect(result.color).toBe('#446688');
    expect(result.memo).toBe('種族:只人 職業:戦士3');
  });

  it('{family}{連番}{Field} を名前付き節へ（行名＝Name、列＝共通ラベル）', () => {
    const result = parseYtsheetCharacter(ytsheet)!;
    const weapon = findSection(result.sections, '武器')!;
    expect(weapon.groups[0].label).toBe('小剣（ショートソード）');
    expect(weapon.groups[0].fields).toContainEqual({ label: '威力', value: '1d6', kind: 'text' });
    expect(weapon.groups[0].fields).toContainEqual({ label: '射程', value: '近接', kind: 'text' });
    expect(findSection(result.sections, '技能')!.groups[0].label).toBe('過重行動');
  });

  it('family を持たないスカラーは共通ラベルでデータ節へ、内部キーは除外', () => {
    const result = parseYtsheetCharacter(ytsheet)!;
    const data = findSection(result.sections, 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: '種族', value: '只人', kind: 'text' });
    expect(data.groups[0].fields).toContainEqual({ label: '生命力', value: 23, kind: 'number' });
    expect(data.groups[0].fields.some((field) => field.label === 'id' || field.label === 'colorBaseBgH')).toBe(false);
  });
});
