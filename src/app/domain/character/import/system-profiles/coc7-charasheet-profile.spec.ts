import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildCoc7CharasheetCharacter,
  isCoc7CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/coc7-charasheet-profile';

describe('buildCoc7CharasheetCharacter', () => {
  // built from real data of the later edition at the archive
  const coc7 = {
    pc_name: '探索者ナナ',
    game: 'coc7',
    color: '#33aa55',
    pc_making_environ: '作成メモ',
    age: '21',
    sex: '男',
    shuzoku: '記者',
    NA1: 65,
    NA2: 90,
    NA3: 65,
    NA4: 65,
    NA5: 75,
    NA6: 75,
    NA7: 85,
    NA8: 80,
    NA9: 7,
    NA10: 16,
    NA11: 15,
    NP1: 65,
    SAN_Left: '61',
    SAN_Max: '99',
    SAN_start: '75',
    SAN_Danger: 60,
    Luck_Left: '39',
    Luck_start: '39',
    dmg_bonus: '1d4',
    build_bonus: '1',
    works_param: '0',
    is_disp_san: 1,
    TS_Total: '340',
    SKAN: ['威圧', '回避', '目星', '医学'],
    SKAP: ['15', '70', '50', '1'],
    SKAD: ['15', '25', '25', '1'],
    SKTP: ['4', '0', '1', '5'],
    arms_name: ['ナイフ', ''],
    arms_damage: ['1d4', ''],
    item_name: ['カメラ', ''],
    item_num: ['1', ''],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('recognises that one token as the later edition', () => {
    expect(isCoc7CharasheetCharacter(coc7)).toBe(true);
    expect(isCoc7CharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
    expect(isCoc7CharasheetCharacter({ pc_name: 'X', game: 'arianrhod' })).toBe(false);
  });

  it('takes the name, the colour, the notes and the dice bot', () => {
    const result = buildCoc7CharasheetCharacter(coc7)!;
    expect(result.sourceFormat).toBe('charasheet');
    expect(result.name).toBe('探索者ナナ');
    expect(result.color).toBe('#33aa55');
    expect(result.dicebot).toBe('Cthulhu7th');
  });

  it('takes the percentile abilities, the movement, the bonus and the build as fields, leaving the resources out', () => {
    const result = buildCoc7CharasheetCharacter(coc7)!;
    expect(result.params).toContainEqual({ label: 'STR', value: '65' });
    expect(result.params).toContainEqual({ label: 'EDU', value: '80' });
    expect(result.params).toContainEqual({ label: '移動率', value: '7' });
    expect(result.params).toContainEqual({ label: 'ダメージボーナス', value: '1d4' });
    expect(result.params).toContainEqual({ label: 'ビルド', value: '1' });
    expect(result.params.some((param) => param.label === 'HP')).toBe(false);
    expect(result.params.some((param) => param.label === 'MP')).toBe(false);
  });

  it('takes the sanity, the two resources and the luck as resources', () => {
    const result = buildCoc7CharasheetCharacter(coc7)!;
    expect(result.statuses).toContainEqual({ label: '正気度', value: 61, max: 99 });
    expect(result.statuses).toContainEqual({ label: 'HP', value: 16, max: 16 });
    expect(result.statuses).toContainEqual({ label: 'MP', value: 15, max: 15 });
    expect(result.statuses).toContainEqual({ label: '幸運', value: 39, max: 39 });
  });

  it('spreads the skills by their names into their categories', () => {
    const result = buildCoc7CharasheetCharacter(coc7)!;
    const skills = findSection(result.sections, '技能')!;
    expect(findGroupFields(skills, '戦闘技能')).toContainEqual({ label: '回避', value: 70, kind: 'number' });
    expect(findGroupFields(skills, '探索技能')).toContainEqual({ label: '目星', value: 50, kind: 'number' });
    expect(findGroupFields(skills, '交渉技能')).toContainEqual({ label: '威圧', value: 15, kind: 'number' });
    expect(findGroupFields(skills, '知識技能')).toContainEqual({ label: '医学', value: 1, kind: 'number' });
  });

  it('spreads the weapons and belongings into named groups', () => {
    const result = buildCoc7CharasheetCharacter(coc7)!;
    expect(findGroupFields(findSection(result.sections, '武器')!, 'ナイフ')).toContainEqual({
      label: 'ダメージ',
      value: '1d4',
      kind: 'text',
    });
    expect(findSection(result.sections, '所持品')!.groups.map((group) => group.label)).toEqual(['カメラ']);
  });

  it('keeps the abilities, the skill arrays, the totals and the duplicated columns out of the leftovers', () => {
    const result = buildCoc7CharasheetCharacter(coc7)!;
    const other = findSection(result.sections, 'その他');
    const labels = other ? other.groups[0].fields.map((field) => field.label) : [];
    expect(labels).toContain('age');
    expect(labels).toContain('shuzoku');
    expect(labels).not.toContain('NA1');
    expect(labels).not.toContain('NP1');
    expect(labels).not.toContain('SKAN');
    expect(labels).not.toContain('works_param');
    expect(labels).not.toContain('TS_Total');
  });

  it('builds the rolls of that edition into the palette, its abilities unmultiplied, with the sanity, the luck, every skill and the bonus', () => {
    const result = buildCoc7CharasheetCharacter(coc7)!;
    expect(result.commands).toContain('CC<={STR} 【STR】');
    expect(result.commands).toContain('CC<={幸運} 【幸運】');
    expect(result.commands).toContain('CC<={正気度} 【正気度ロール】');
    expect(result.commands).toContain('CC<={回避} 【回避】');
    expect(result.commands).toContain('CC<={医学} 【医学】');
    expect(result.commands).toContain('1d4 【ダメージボーナス】');
    expect(result.commands).not.toContain('*5');
    expect(result.commands).not.toContain('CCB<=');
  });
});
