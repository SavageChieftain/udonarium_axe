import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildSengenCharasheetCharacter,
  isSengenCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/sengen-charasheet-profile';

describe('buildSengenCharasheetCharacter', () => {
  // built from real data of one system at the archive
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

  it('recognises the system', () => {
    expect(isSengenCharasheetCharacter(sengen)).toBe(true);
    expect(isSengenCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes its five abilities and the dice bot', () => {
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

  it('spreads the arts and the spells with their names, reading each family code through the map', () => {
    const result = buildSengenCharasheetCharacter(sengen)!;
    const spells = findSection(result.sections, '妖術・魔法')!;
    expect(spells.groups[0].label).toBe('火炎の術');
    expect(spells.groups[0].fields).toContainEqual({ label: '系統', value: '妖術', kind: 'text' });
  });

  it('builds the roll of that system, on three dice, into the palette', () => {
    const result = buildSengenCharasheetCharacter(sengen)!;
    expect(result.commands).toContain('SGS+5 【身体判定】');
    expect(result.commands).toContain('SGS+7 【耐久判定】');
  });
});
