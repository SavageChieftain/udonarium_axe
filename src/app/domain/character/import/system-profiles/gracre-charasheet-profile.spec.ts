import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildGracreCharasheetCharacter,
  isGracreCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/gracre-charasheet-profile';

describe('buildGracreCharasheetCharacter', () => {
  // charasheet.vampire-blood.net の グランクレストRPG（game="gracre"）実データに即した構造
  const gracre = {
    pc_name: 'リオ',
    game: 'gracre',
    color: '#557799',
    shuzoku: '人間',
    age: '19',
    NB1: '3',
    NB2: '4',
    NB3: '4',
    NB4: '4',
    NB5: '5',
    NB6: '7',
    acts_name: ['魔法', 'キュアライトウーンズ'],
    acts_hit: ['3d+10', '3d+4'],
    acts_range: ['', '4sq'],
    acts_cost: ['', '<魔法>+5'],
    evades_name: ['回避'],
    evades_hit: ['2d+4'],
    effect_name: ['基礎魔法習得', ''],
    effect_shozoku: ['魔法（自動）', ''],
    magic_name: ['キュアライトウーンズ', 'ファイアーボール'],
    magic_range: ['接触', '20m/半径10m'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('game="gracre" を判別する', () => {
    expect(isGracreCharasheetCharacter(gracre)).toBe(true);
    expect(isGracreCharasheetCharacter({ pc_name: 'X', game: 'swordworld2' })).toBe(false);
  });

  it('能力ボーナス（標準順）と dicebot GranCrest を取り込む', () => {
    const result = buildGracreCharasheetCharacter(gracre)!;
    expect(result.dicebot).toBe('GranCrest');
    expect(result.params).toContainEqual({ label: '器用B', value: '3' });
    expect(result.params).toContainEqual({ label: '精神B', value: '7' });
  });

  it('行動・特技・魔法を名前付きで展開する', () => {
    const result = buildGracreCharasheetCharacter(gracre)!;
    expect(findSection(result.sections, '行動')!.groups.map((group) => group.label)).toEqual([
      '魔法',
      'キュアライトウーンズ',
    ]);
    expect(findSection(result.sections, '特技')!.groups.map((group) => group.label)).toEqual(['基礎魔法習得']);
    expect(findSection(result.sections, '魔法')!.groups.map((group) => group.label)).toEqual([
      'キュアライトウーンズ',
      'ファイアーボール',
    ]);
  });

  it('チャットパレットに能力判定・行動の振り式・回避を生成する', () => {
    const result = buildGracreCharasheetCharacter(gracre)!;
    expect(result.commands).toContain('2d6+{精神B} 【精神判定】');
    expect(result.commands).toContain('3d+10 【魔法】');
    expect(result.commands).toContain('2d+4 【回避】');
  });
});
