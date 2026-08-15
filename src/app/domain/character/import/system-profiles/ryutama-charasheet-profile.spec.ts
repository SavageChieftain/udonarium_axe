import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildRyutamaCharasheetCharacter,
  isRyutamaCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/ryutama-charasheet-profile';

describe('buildRyutamaCharasheetCharacter', () => {
  // built from real data of one system at the archive
  const ryutama = {
    pc_name: 'ティナ',
    game: 'ryutama',
    class_name: 'ヒーラー',
    shuzoku_name: '草原の民',
    S1: '4',
    S2: '6',
    S3: '8',
    S4: '6',
    cls_name: ['応急手当', ''],
    cls_timing: ['メジャー', ''],
    cls_kouka: ['HPを回復する', ''],
    spell_name: ['ヒール', '光の矢'],
    spell_mp: ['2', '1'],
    spell_memo: ['HP回復', 'ダメージ'],
    item_name: ['薬草'],
    item_weight: ['1'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises the system', () => {
    expect(isRyutamaCharasheetCharacter(ryutama)).toBe(true);
    expect(isRyutamaCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes its four abilities as the dice they roll, and the dice bot', () => {
    const result = buildRyutamaCharasheetCharacter(ryutama)!;
    expect(result.dicebot).toBe('Ryutama');
    expect(result.params).toEqual([
      { label: '体力', value: 'd4' },
      { label: '敏捷', value: 'd6' },
      { label: '知力', value: 'd8' },
      { label: '精神', value: 'd6' },
    ]);
  });

  it('spreads the class abilities, the spells and the belongings with their names', () => {
    const result = buildRyutamaCharasheetCharacter(ryutama)!;
    expect(findSection(result.sections, 'クラス能力')!.groups.map((group) => group.label)).toEqual(['応急手当']);
    expect(findSection(result.sections, '呪文')!.groups.map((group) => group.label)).toEqual(['ヒール', '光の矢']);
    expect(findSection(result.sections, '所持品')!.groups[0].label).toBe('薬草');
  });

  it('builds the die of each ability into the palette', () => {
    const result = buildRyutamaCharasheetCharacter(ryutama)!;
    expect(result.commands).toContain('1d4 【体力】');
    expect(result.commands).toContain('1d8 【知力】');
  });
});
