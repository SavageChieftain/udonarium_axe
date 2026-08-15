import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildYtsheetSw25Character,
  isYtsheetSw25Character,
} from '@axe/domain/character/import/system-profiles/ytsheet-sw25-profile';

describe('buildYtsheetSw25Character', () => {
  // built from real json of one system at the sheet service
  const sw = {
    characterName: 'リトルフラワー',
    freeNote: 'メモ文',
    race: 'ルーンフォーク',
    age: '不明',
    gender: '女性',
    faith: '無',
    level: '9',
    expTotal: '40000',
    playerName: 'PL',
    sttDex: 18,
    bonusDex: 5,
    sttAgi: 16,
    bonusAgi: 4,
    sttStr: 20,
    bonusStr: 6,
    sttVit: 14,
    bonusVit: 3,
    sttInt: 12,
    bonusInt: 2,
    sttMnd: 10,
    bonusMnd: 1,
    hpTotal: 60,
    mpTotal: 20,
    vitResistTotal: 18,
    mndResistTotal: 14,
    initiative: 16,
    mobilityTotal: 24,
    lvGra: 9,
    lvRid: 8,
    lvSco: 7,
    lvMag: 5,
    lvEnh: 2,
    lvSag: 1,
    lvFig: 0,
    combatFeatsAuto: '全力攻撃',
    combatFeatsLv1: '武器習熟/格闘',
    combatFeatsLv3: 'カウンター',
    weaponNum: 2,
    weapon1Name: '狼牙爪(拳)',
    weapon1Category: '格闘',
    weapon1AccTotal: 14,
    weapon1Rate: 30,
    weapon1Crit: 11,
    weapon1DmgTotal: 14,
    weapon2Name: '狼牙爪(爪)',
    weapon2AccTotal: 17,
    weapon2Rate: 15,
    weapon2Crit: 10,
    weapon2DmgTotal: 14,
    armour1Name: '革鎧',
    armour1Category: '非金属鎧',
    armour1Def: 3,
    armour1Eva: 0,
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('recognises the system', () => {
    expect(isYtsheetSw25Character(sw)).toBe(true);
    expect(isYtsheetSw25Character({ pc_name: 'X' })).toBe(false);
    expect(isYtsheetSw25Character({ kind: 'character' })).toBe(false);
  });

  it('takes the name, the notes and the dice bot', () => {
    const result = buildYtsheetSw25Character(sw)!;
    expect(result.sourceFormat).toBe('ytsheet');
    expect(result.name).toBe('リトルフラワー');
    expect(result.memo).toBe('メモ文');
    expect(result.dicebot).toBe('SwordWorld2.5');
  });

  it('takes the abilities, the bonuses and the resistances as fields, leaving the resources out', () => {
    const result = buildYtsheetSw25Character(sw)!;
    expect(result.params).toContainEqual({ label: '器用', value: '18' });
    expect(result.params).toContainEqual({ label: '器用B', value: '5' });
    expect(result.params).toContainEqual({ label: '筋力', value: '20' });
    expect(result.params).toContainEqual({ label: '筋力B', value: '6' });
    expect(result.params).toContainEqual({ label: '生命抵抗', value: '18' });
    expect(result.params).toContainEqual({ label: '先制力', value: '16' });
    expect(result.params.some((param) => param.label === 'HP')).toBe(false);
  });

  it('takes the two resources as resources', () => {
    const result = buildYtsheetSw25Character(sw)!;
    expect(result.statuses).toContainEqual({ label: 'HP', value: 60, max: 60 });
    expect(result.statuses).toContainEqual({ label: 'MP', value: 20, max: 20 });
  });

  it('maps each abbreviated level key onto its skill, passing over the unlearnt', () => {
    const result = buildYtsheetSw25Character(sw)!;
    const skills = findGroupFields(findSection(result.sections, '技能')!, '技能');
    expect(skills).toContainEqual({ label: 'グラップラー', value: 9, kind: 'number' });
    expect(skills).toContainEqual({ label: 'マギテック', value: 5, kind: 'number' });
    expect(skills).toContainEqual({ label: 'セージ', value: 1, kind: 'number' });
    expect(skills.some((field) => field.label === 'ファイター')).toBe(false);
  });

  it('spreads the combat feats, the weapons, the armour and the profile under readable labels', () => {
    const result = buildYtsheetSw25Character(sw)!;
    expect(findGroupFields(findSection(result.sections, '戦闘特技')!, '習得')).toContainEqual({
      label: 'Lv1',
      value: '武器習熟/格闘',
      kind: 'text',
    });
    const weapon = findGroupFields(findSection(result.sections, '武器')!, '狼牙爪(拳)');
    expect(weapon).toContainEqual({ label: '命中', value: 14, kind: 'number' });
    expect(weapon).toContainEqual({ label: '威力', value: 30, kind: 'number' });
    expect(weapon).toContainEqual({ label: 'C値', value: 11, kind: 'number' });
    expect(findGroupFields(findSection(result.sections, '防具')!, '革鎧')).toContainEqual({
      label: '防護点',
      value: 3,
      kind: 'number',
    });
    expect(findGroupFields(findSection(result.sections, 'プロフィール')!, '基本')).toContainEqual({
      label: '種族',
      value: 'ルーンフォーク',
      kind: 'text',
    });
  });

  it('builds the ability rolls, the accuracy of each weapon and its damage into the palette', () => {
    const result = buildYtsheetSw25Character(sw)!;
    expect(result.commands).toContain('2d6+{筋力B} 【筋力判定】');
    expect(result.commands).toContain('2d6+14 【狼牙爪(拳) 命中】');
    expect(result.commands).toContain('K30+14@11 【狼牙爪(拳) 打撃】');
  });
});
