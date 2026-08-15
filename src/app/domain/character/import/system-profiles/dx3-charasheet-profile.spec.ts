import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildDx3CharasheetCharacter,
  isDx3CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/dx3-charasheet-profile';

describe('buildDx3CharasheetCharacter', () => {
  // built from real data of that system at the archive
  const dx3 = {
    pc_name: 'クロウ',
    game: 'dx3',
    color: '#aa2244',
    works: 'チルドレン',
    cover: '学生',
    S1: '2',
    S2: '1',
    S3: '2',
    S4: '1',
    skill_tokugi: ['', '', '', '', '', '', '6', '1', '2', '', '1', '1'],
    skill_total: ['1r', '1r', '1r', '2r', '2r', '2r', '5r+6', '5r+1', '5r+2', '2r', '2r+1', '2r+1'],
    skill_memo: ['', '', '', '', '', '', '', '', 'オカルト', '', '', 'UGN'],
    effect_name: ['コンセントレイト', '黒の鉄槌', ''],
    effect_lv: ['2', '3', ''],
    effect_timing: ['マイナー', 'メジャー', ''],
    effect_shozoku: ['ノイマン', 'バロール', ''],
    easyeffect_name: ['基本コンボ'],
    easyeffect_timing: ['メジャー'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises the system', () => {
    expect(isDx3CharasheetCharacter(dx3)).toBe(true);
    expect(isDx3CharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes its four abilities in their usual order, and the dice bot', () => {
    const result = buildDx3CharasheetCharacter(dx3)!;
    expect(result.dicebot).toBe('DoubleCross');
    expect(result.params).toEqual([
      { label: '肉体', value: '2' },
      { label: '感覚', value: '1' },
      { label: '精神', value: '2' },
      { label: '社会', value: '1' },
    ]);
  });

  it('spreads its twelve fixed skills with their totals and their fields of study', () => {
    const result = buildDx3CharasheetCharacter(dx3)!;
    const skills = findSection(result.sections, '技能')!;
    const knowledge = skills.groups.find((group) => group.label === '知識:オカルト')!;
    expect(knowledge.fields).toContainEqual({ label: '技能値', value: '5DX+2', kind: 'text' });
    expect(skills.groups.find((group) => group.label === '情報:UGN')).toBeDefined();
    expect(skills.groups.find((group) => group.label === '白兵')).toBeDefined();
  });

  it('spreads the effects and the combos with their names', () => {
    const result = buildDx3CharasheetCharacter(dx3)!;
    expect(findSection(result.sections, 'エフェクト')!.groups.map((group) => group.label)).toEqual([
      'コンセントレイト',
      '黒の鉄槌',
    ]);
    expect(findSection(result.sections, 'コンボ')!.groups.map((group) => group.label)).toEqual(['基本コンボ']);
  });

  it('builds the skill rolls of that system into the palette', () => {
    const result = buildDx3CharasheetCharacter(dx3)!;
    expect(result.commands).toContain('5DX+6 【RC】');
    expect(result.commands).toContain('1DX 【白兵】');
    expect(result.commands).toContain('5DX+2 【知識:オカルト】');
  });
});
