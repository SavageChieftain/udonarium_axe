import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildRyutamaCharasheetCharacter,
  isRyutamaCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/ryutama-charasheet-profile';

describe('buildRyutamaCharasheetCharacter', () => {
  // charasheet.vampire-blood.net の りゅうたま（game="ryutama"）実データに即した構造
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

  it('game="ryutama" を判別する', () => {
    expect(isRyutamaCharasheetCharacter(ryutama)).toBe(true);
    expect(isRyutamaCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('4 能力値（体力/敏捷/知力/精神）をサイコロ面数つき・dicebot Ryutama で取り込む', () => {
    const result = buildRyutamaCharasheetCharacter(ryutama)!;
    expect(result.dicebot).toBe('Ryutama');
    expect(result.params).toEqual([
      { label: '体力', value: 'd4' },
      { label: '敏捷', value: 'd6' },
      { label: '知力', value: 'd8' },
      { label: '精神', value: 'd6' },
    ]);
  });

  it('クラス能力・呪文・所持品を名前付きで展開する', () => {
    const result = buildRyutamaCharasheetCharacter(ryutama)!;
    expect(findSection(result.sections, 'クラス能力')!.groups.map((group) => group.label)).toEqual(['応急手当']);
    expect(findSection(result.sections, '呪文')!.groups.map((group) => group.label)).toEqual(['ヒール', '光の矢']);
    expect(findSection(result.sections, '所持品')!.groups[0].label).toBe('薬草');
  });

  it('チャットパレットに各能力のサイコロを生成する', () => {
    const result = buildRyutamaCharasheetCharacter(ryutama)!;
    expect(result.commands).toContain('1d4 【体力】');
    expect(result.commands).toContain('1d8 【知力】');
  });
});
