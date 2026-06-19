import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildDx3CharasheetCharacter,
  isDx3CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/dx3-charasheet-profile';

describe('buildDx3CharasheetCharacter', () => {
  // charasheet.vampire-blood.net の ダブルクロス3rd（game="dx3"）実データに即した構造
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

  it('game="dx3" を判別する', () => {
    expect(isDx3CharasheetCharacter(dx3)).toBe(true);
    expect(isDx3CharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('4 能力値（標準順）と dicebot DoubleCross を取り込む', () => {
    const result = buildDx3CharasheetCharacter(dx3)!;
    expect(result.dicebot).toBe('DoubleCross');
    expect(result.params).toEqual([
      { label: '肉体', value: '2' },
      { label: '感覚', value: '1' },
      { label: '精神', value: '2' },
      { label: '社会', value: '1' },
    ]);
  });

  it('12 固定技能を skill_total の DX 式・分野付き名称で展開する', () => {
    const result = buildDx3CharasheetCharacter(dx3)!;
    const skills = findSection(result.sections, '技能')!;
    const knowledge = skills.groups.find((group) => group.label === '知識:オカルト')!;
    expect(knowledge.fields).toContainEqual({ label: '技能値', value: '5DX+2', kind: 'text' });
    expect(skills.groups.find((group) => group.label === '情報:UGN')).toBeDefined();
    expect(skills.groups.find((group) => group.label === '白兵')).toBeDefined();
  });

  it('エフェクト・コンボを名前付きで展開する', () => {
    const result = buildDx3CharasheetCharacter(dx3)!;
    expect(findSection(result.sections, 'エフェクト')!.groups.map((group) => group.label)).toEqual([
      'コンセントレイト',
      '黒の鉄槌',
    ]);
    expect(findSection(result.sections, 'コンボ')!.groups.map((group) => group.label)).toEqual(['基本コンボ']);
  });

  it('チャットパレットに DX 式の技能ロールを生成する', () => {
    const result = buildDx3CharasheetCharacter(dx3)!;
    expect(result.commands).toContain('5DX+6 【RC】');
    expect(result.commands).toContain('1DX 【白兵】');
    expect(result.commands).toContain('5DX+2 【知識:オカルト】');
  });
});
