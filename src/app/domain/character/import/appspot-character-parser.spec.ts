import { isAppspotCharacter, parseAppspotCharacter } from '@axe/domain/character/import/appspot-character-parser';
import { parseImportedCharacterText } from '@axe/domain/character/import/character-import-format';
import { ImportedSection } from '@axe/domain/character/import/imported-character';
import { loadLabelMaps } from '@axe/domain/character/import/system-profiles/label-maps';

describe('parseAppspotCharacter', () => {
  beforeAll(() => loadLabelMaps());

  // built from real data of one system at the sheet warehouse
  const dx3 = {
    base: {
      name: '関橋 元基',
      age: '16',
      cover: '高校生',
      memo: '4年前にジャームに襲われて家族を失った少年。',
      syndromes: { primary: { syndrome: 'ハヌマーン' }, secondary: { syndrome: 'サラマンダー' } },
    },
    baseAbility: {
      body: { total: '7' },
      sense: { total: '1' },
      mind: { total: '2' },
      society: { total: '2' },
    },
    subAbility: {
      hp: { correct: null, total: '36' },
      erotion: { correct: null, total: '30' },
      action: { correct: '0', total: '4' },
    },
    skills: { B: [{ lv4: '5', name4: 'UGN' }] },
    combo: [
      {
        name: 'ルートキット',
        under100: { attack: '11', cost: '9', timing: 'メジャー', type: '白兵', range: '至近' },
      },
    ],
    weapons: [{ name: 'トンファー', attack: '2', guard: '3', range: '至近', skill: '白兵' }],
    armours: [{ name: null, armour: null, type: null }],
    items: [{ name: 'コネ UGN 幹部', notes: 'UGN で情報を振るときダイス +2', skill: '情報' }],
    outline: 'シナリオ用の設定テキスト。',
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises the shape of the warehouse data', () => {
    expect(isAppspotCharacter(dx3)).toBe(true);
    expect(isAppspotCharacter({ kind: 'character', data: {} })).toBe(false);
  });

  it('takes the name, the abilities and the sub-abilities', () => {
    const result = parseImportedCharacterText(JSON.stringify(dx3))!;
    expect(result.sourceFormat).toBe('appspot');
    expect(result.name).toBe('関橋 元基');
    expect(result.statuses).toContainEqual({ label: 'hp', value: 36, max: 36 });
    expect(result.params).toContainEqual({ label: 'body', value: '7' });
  });

  it('maps the ability keys onto the labels of the form when it is given them', () => {
    const result = parseAppspotCharacter(dx3, { 'baseAbility.body': '肉体' })!;
    expect(result.params).toContainEqual({ label: '肉体', value: '7' });
    expect(result.params.some((param) => param.label === 'body')).toBe(false);
  });

  it('flattens the nested profile', () => {
    const result = parseAppspotCharacter(dx3)!;
    const profile = findSection(result.sections, 'プロフィール')!;
    const basic = profile.groups.find((group) => group.label === '基本')!;
    expect(basic.fields).toContainEqual({ label: 'cover', value: '高校生', kind: 'text' });
    expect(basic.fields).toContainEqual({ label: 'age', value: 16, kind: 'number' });
    // flattens a nested field into a dotted name
    const syndromes = profile.groups.find((group) => group.label === 'syndromes')!;
    expect(syndromes.fields).toContainEqual({ label: 'primary.syndrome', value: 'ハヌマーン', kind: 'text' });
  });

  it('gathers the systems own data, such as the combos, weapons and items, into sections', () => {
    const result = parseAppspotCharacter(dx3)!;
    const combo = findSection(result.sections, 'コンボ')!;
    expect(combo.groups[0].label).toBe('ルートキット');
    expect(combo.groups[0].fields).toContainEqual({ label: 'under100.attack', value: 11, kind: 'number' });
    expect(combo.groups[0].fields).toContainEqual({ label: 'under100.timing', value: 'メジャー', kind: 'text' });

    const weapons = findSection(result.sections, '武器')!;
    expect(weapons.groups[0].label).toBe('トンファー');
    expect(weapons.groups[0].fields).toContainEqual({ label: 'skill', value: '白兵', kind: 'text' });

    const items = findSection(result.sections, 'アイテム')!;
    expect(items.groups[0].label).toBe('コネ UGN 幹部');

    const skills = findSection(result.sections, '技能')!;
    expect(skills.groups.some((group) => group.fields.some((field) => field.value === 'UGN'))).toBe(true);
  });

  it('passes over an empty row', () => {
    const result = parseAppspotCharacter(dx3)!;
    expect(findSection(result.sections, '防具')).toBeUndefined();
  });

  it('makes a section of a string at the top level as well', () => {
    const result = parseAppspotCharacter(dx3)!;
    const outline = findSection(result.sections, '設定')!;
    expect(outline.groups[0].fields[0].value).toBe('シナリオ用の設定テキスト。');
  });

  it('takes a system that wraps its data as readily', () => {
    const wrapped = { base: {}, data: { base: { name: '忍' }, subAbility: { hp: { total: 12 } } } };
    const result = parseAppspotCharacter(wrapped)!;
    expect(result.name).toBe('忍');
    expect(result.statuses).toEqual([{ label: 'hp', value: 12, max: 12 }]);
  });
});
