import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildNw3CharasheetCharacter,
  isNw3CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/nw3-charasheet-profile';

describe('buildNw3CharasheetCharacter', () => {
  // charasheet.vampire-blood.net の ナイトウィザード3rd（game="nw3"）実データに即した構造
  const nw3 = {
    pc_name: 'シノ',
    game: 'nw3',
    level: '1',
    class1_name: '魔鎧使い',
    class2_name: '箒人',
    S1: '4',
    S2: '4',
    S3: '3',
    S4: '2',
    S5: '2',
    S6: '3',
    S7: '3',
    S8: '2',
    effect_name: ['カバーリング', '魔鎧所持'],
    effect_timing: ['DR直前', '常時'],
    effect_shozoku: ['魔鎧使い', '魔鎧使い'],
    arms_name: ['サンダーショット'],
    arms_range: ['近距離'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('game="nw3" を判別する', () => {
    expect(isNw3CharasheetCharacter(nw3)).toBe(true);
    expect(isNw3CharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('8 能力値（筋力/器用/感覚/理知/意思/幸運/耐久/魔法）と dicebot NightWizard3rd を取り込む', () => {
    const result = buildNw3CharasheetCharacter(nw3)!;
    expect(result.dicebot).toBe('NightWizard3rd');
    expect(result.params).toEqual([
      { label: '筋力', value: '4' },
      { label: '器用', value: '4' },
      { label: '感覚', value: '3' },
      { label: '理知', value: '2' },
      { label: '意思', value: '2' },
      { label: '幸運', value: '3' },
      { label: '耐久', value: '3' },
      { label: '魔法', value: '2' },
    ]);
  });

  it('特技・武器を名前付きで展開する', () => {
    const result = buildNw3CharasheetCharacter(nw3)!;
    expect(findSection(result.sections, '特技')!.groups.map((group) => group.label)).toEqual([
      'カバーリング',
      '魔鎧所持',
    ]);
    expect(findSection(result.sections, '武器')!.groups[0].label).toBe('サンダーショット');
  });

  it('チャットパレットに {基本値}NW の判定を生成する', () => {
    const result = buildNw3CharasheetCharacter(nw3)!;
    expect(result.commands).toContain('4NW 【筋力】');
    expect(result.commands).toContain('2NW 【魔法】');
  });
});
