import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildAra2CharasheetCharacter,
  isAra2CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/ara2-charasheet-profile';

describe('buildAra2CharasheetCharacter', () => {
  // built from real data of one system at the archive
  const ara2 = {
    pc_name: 'リーフ',
    game: 'ara2',
    color: '#3388cc',
    pc_making_environ: 'メモ',
    shuzoku: 'エルフ',
    main_class: 'メイジ',
    support_class: 'セージ',
    age: '120',
    sex: '女',
    V_level: '3',
    V_fate: '5',
    NK1: '7',
    NK2: '8',
    NK3: '9',
    NK4: '17',
    NK5: '11',
    NK6: '12',
    NB1: '2',
    NB2: '2',
    NB3: '3',
    NB4: '5',
    NB5: '3',
    NB6: '4',
    skill_name: ['ファイアボルト', ''],
    skill_lv: ['1', ''],
    skill_timing: ['メジャー', ''],
    skill_hantei: ['知力', ''],
    skill_range: ['20m', ''],
    ippanskill_name: ['コンセントレイション'],
    ippanskill_lv: ['1'],
    item_name: ['杖', ''],
    item_price: ['100', ''],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('recognises the system', () => {
    expect(isAra2CharasheetCharacter(ara2)).toBe(true);
    expect(isAra2CharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes the abilities, their bonuses, the level, the fate and the dice bot', () => {
    const result = buildAra2CharasheetCharacter(ara2)!;
    expect(result.sourceFormat).toBe('charasheet');
    expect(result.name).toBe('リーフ');
    expect(result.dicebot).toBe('Arianrhod');
    expect(result.params).toContainEqual({ label: '器用', value: '7' });
    expect(result.params).toContainEqual({ label: '感覚', value: '17' });
    expect(result.params).toContainEqual({ label: '感覚B', value: '5' });
    expect(result.params).toContainEqual({ label: 'フェイト', value: '5' });
  });

  it('spreads the skills, the general skills, the belongings and the profile with their names', () => {
    const result = buildAra2CharasheetCharacter(ara2)!;
    expect(findGroupFields(findSection(result.sections, 'スキル')!, 'ファイアボルト')).toContainEqual({
      label: 'タイミング',
      value: 'メジャー',
      kind: 'text',
    });
    expect(findSection(result.sections, '一般スキル')!.groups.map((group) => group.label)).toEqual([
      'コンセントレイション',
    ]);
    expect(findSection(result.sections, '所持品')!.groups.map((group) => group.label)).toEqual(['杖']);
    expect(findGroupFields(findSection(result.sections, 'プロフィール')!, '基本')).toContainEqual({
      label: 'メインクラス',
      value: 'メイジ',
      kind: 'text',
    });
  });

  it('builds a roll of two dice plus the ability bonus into the palette', () => {
    const result = buildAra2CharasheetCharacter(ara2)!;
    expect(result.commands).toContain('2d6+{感覚B} 【感覚判定】');
    expect(result.commands).toContain('2d6+{器用B} 【器用判定】');
  });
});
