import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildSengenCharasheetCharacter,
  isSengenCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/sengen-charasheet-profile';

describe('buildSengenCharasheetCharacter', () => {
  // charasheet.vampire-blood.net の 千幻抄（game="sengen"）実データに即した構造
  const sengen = {
    pc_name: '香織',
    game: 'sengen',
    shuzoku: '妖怪',
    NP1: '5',
    NP2: '7',
    NP3: '6',
    NP4: '6',
    NP5: '5',
    effect_name: ['火炎の術', ''],
    effect_shozoku: ['5', ''],
    effect_lv: ['2', ''],
    effect_memo: ['火の妖術', ''],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('game="sengen" を判別する', () => {
    expect(isSengenCharasheetCharacter(sengen)).toBe(true);
    expect(isSengenCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('5 能力値（身体/耐久/知性/感覚/意志）と dicebot Sengensyou を取り込む', () => {
    const result = buildSengenCharasheetCharacter(sengen)!;
    expect(result.dicebot).toBe('Sengensyou');
    expect(result.params).toEqual([
      { label: '身体', value: '5' },
      { label: '耐久', value: '7' },
      { label: '知性', value: '6' },
      { label: '感覚', value: '6' },
      { label: '意志', value: '5' },
    ]);
  });

  it('妖術・魔法を名前付きで展開し、系統コードを権威マップで変換する', () => {
    const result = buildSengenCharasheetCharacter(sengen)!;
    const spells = findSection(result.sections, '妖術・魔法')!;
    expect(spells.groups[0].label).toBe('火炎の術');
    expect(spells.groups[0].fields).toContainEqual({ label: '系統', value: '妖術', kind: 'text' });
  });

  it('チャットパレットに SGS+能力値 の判定を生成する（3D6系）', () => {
    const result = buildSengenCharasheetCharacter(sengen)!;
    expect(result.commands).toContain('SGS+5 【身体判定】');
    expect(result.commands).toContain('SGS+7 【耐久判定】');
  });
});
