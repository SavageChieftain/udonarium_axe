import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildInsaneAppspotCharacter,
  isInsaneAppspotCharacter,
} from '@axe/domain/character/import/system-profiles/insane-appspot-profile';

describe('buildInsaneAppspotCharacter', () => {
  // built from real data of one system at the warehouse
  const insane = {
    base: {
      name: '夜中 深夜',
      nameKana: 'よなか しんや',
      cover: '高校生',
      age: '17',
      sex: '男',
      curiosity: '怪異',
      exp: '5',
      player: 'PL',
      memo: 'メモ文',
    },
    ability: [
      { name: '基本攻撃', type: '攻撃', targetSkill: '殴打', effect: '1ダメージ', page: '基44' },
      { name: '', type: null, targetSkill: null },
    ],
    learned: [{ id: 'skills.row1.name0' }, { id: 'skills.row2.name3' }],
    skills: { a: '1', b: null, c: null, d: null, e: null, f: '1' },
    outline: '設定テキスト',
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('recognises the system', () => {
    expect(isInsaneAppspotCharacter(insane)).toBe(true);
    expect(isInsaneAppspotCharacter({ kind: 'character' })).toBe(false);
  });

  it('takes the name, the notes and the dice bot', () => {
    const result = buildInsaneAppspotCharacter(insane)!;
    expect(result.sourceFormat).toBe('appspot');
    expect(result.name).toBe('夜中 深夜');
    expect(result.memo).toBe('メモ文');
    expect(result.dicebot).toBe('Insane');
  });

  it('spreads the abilities into named groups with the skill each calls for, passing over the empty ones', () => {
    const result = buildInsaneAppspotCharacter(insane)!;
    const abilities = findSection(result.sections, 'アビリティ')!;
    expect(abilities.groups.map((group) => group.label)).toEqual(['基本攻撃']);
    expect(findGroupFields(abilities, '基本攻撃')).toContainEqual({ label: '指定特技', value: '殴打', kind: 'text' });
  });

  it('spreads the profile under readable labels', () => {
    const result = buildInsaneAppspotCharacter(insane)!;
    const profile = findSection(result.sections, 'プロフィール')!;
    expect(findGroupFields(profile, '基本')).toContainEqual({ label: 'カバー', value: '高校生', kind: 'text' });
    expect(findGroupFields(profile, '基本')).toContainEqual({ label: '好奇心', value: '怪異', kind: 'text' });
  });

  it('builds the gapped skill table from that systems own, marking what was learnt and where the gaps fall', () => {
    const result = buildInsaneAppspotCharacter(insane)!;
    const table = result.skillTables[0];
    expect(table.categories).toEqual(['暴力', '情動', '知覚', '技術', '知識', '怪異']);
    // one row of one column
    expect(table.skillsByCategory[0][1]).toBe('拷問');
    expect(table.checked![0][1]).toBe(true);
    // another row of another
    expect(table.skillsByCategory[3][2]).toBe('整理');
    expect(table.checked![3][2]).toBe(true);
    expect(table.gaps).toEqual([true, false, false, false, false, true]);
  });

  it('builds the ability rolls of that system into the palette, each with the skill it calls for', () => {
    const result = buildInsaneAppspotCharacter(insane)!;
    expect(result.commands).toContain('2D6>=5 【判定】');
    expect(result.commands).toContain('2D6>=5 【基本攻撃／殴打】');
  });
});
