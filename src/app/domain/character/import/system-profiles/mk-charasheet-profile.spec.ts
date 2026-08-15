import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildMkCharasheetCharacter,
  isMkCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/mk-charasheet-profile';

describe('buildMkCharasheetCharacter', () => {
  // built from real data of one system at the archive
  const mk = {
    pc_name: 'ティナ',
    game: 'mk',
    class_name: '騎士',
    job1_name: '武人',
    jobginou_name: '剣劇',
    nation_name: '第三魔法公国',
    NC1: '1',
    NC2: '2',
    NC3: '2',
    NC4: '4',
    NC5: '15',
    NC6: '2',
    NC7: '9',
    NC8: '12',
    ginou_name: ['武勲', ''],
    ginou_timing: ['補助', ''],
    ginou_memo: ['攻撃を組み合わせる', ''],
    conne_name: ['師匠'],
    conne_like: ['尊敬'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises the system', () => {
    expect(isMkCharasheetCharacter(mk)).toBe(true);
    expect(isMkCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes its four main abilities, the lesser values and the dice bot', () => {
    const result = buildMkCharasheetCharacter(mk)!;
    expect(result.dicebot).toBe('MeikyuKingdom');
    expect(result.params).toContainEqual({ label: '才覚', value: '1' });
    expect(result.params).toContainEqual({ label: '武勇', value: '4' });
    expect(result.params).toContainEqual({ label: '器', value: '15' });
    expect(result.params).toContainEqual({ label: '気力', value: '12' });
  });

  it('spreads the skills, the connections and the profile with their names', () => {
    const result = buildMkCharasheetCharacter(mk)!;
    expect(findSection(result.sections, '技能')!.groups.map((group) => group.label)).toEqual(['武勲']);
    expect(findSection(result.sections, 'コネ')!.groups[0].label).toBe('師匠');
    expect(findSection(result.sections, 'プロフィール')!.groups[0].fields).toContainEqual({
      label: 'ジョブ技能',
      value: '剣劇',
      kind: 'text',
    });
  });

  it('builds the roll of that system into the palette', () => {
    const result = buildMkCharasheetCharacter(mk)!;
    expect(result.commands).toContain('2MK+1 【才覚判定】');
    expect(result.commands).toContain('2MK+4 【武勇判定】');
  });
});
