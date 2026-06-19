import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildSwordWorldCharasheetCharacter,
  isSwordWorldCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/swordworld-charasheet-profile';

describe('buildSwordWorldCharasheetCharacter', () => {
  // charasheet.vampire-blood.net の 旧ソード・ワールド（game="swordworld"）実データに即した構造
  const sw1 = {
    pc_name: 'カイル',
    game: 'swordworld',
    color: '#884422',
    shuzoku: 'エルフ',
    HP: '17',
    MP: '21',
    NB1: '3',
    NB2: '2',
    NB3: '3',
    NB4: '2',
    NB5: '2',
    NB6: '3',
    JK_name: ['ソード', ''],
    JK_lv: ['5', ''],
    JK_eishou: ['', ''],
    arms_name: ['ヘビーメイス', 'ダガー', 'メイジスタッフ'],
    arms_iryoku: ['18', '5', '15'],
    arms_critical: ['12', '0', 'NaN'],
    arms_damage: ['1', '0', '0'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('game="swordworld" を判別する（2.0 とは区別）', () => {
    expect(isSwordWorldCharasheetCharacter(sw1)).toBe(true);
    expect(isSwordWorldCharasheetCharacter({ pc_name: 'X', game: 'swordworld2' })).toBe(false);
  });

  it('能力ボーナス・HP/MP・dicebot SwordWorld を取り込む', () => {
    const result = buildSwordWorldCharasheetCharacter(sw1)!;
    expect(result.dicebot).toBe('SwordWorld');
    expect(result.params).toContainEqual({ label: '器用B', value: '3' });
    expect(result.statuses).toContainEqual({ label: 'HP', value: 17, max: 17 });
  });

  it('技能・武器を名前付きで展開する', () => {
    const result = buildSwordWorldCharasheetCharacter(sw1)!;
    expect(findSection(result.sections, '技能')!.groups.map((group) => group.label)).toEqual(['ソード']);
    expect(findSection(result.sections, '武器')!.groups.map((group) => group.label)).toEqual([
      'ヘビーメイス',
      'ダガー',
      'メイジスタッフ',
    ]);
  });

  it('打撃は妥当な C 値のみ @ を付け、不正値（0/NaN）は素の K にする', () => {
    const result = buildSwordWorldCharasheetCharacter(sw1)!;
    expect(result.commands).toContain('K18@12+1 【ヘビーメイス 打撃】');
    expect(result.commands).toContain('K5 【ダガー 打撃】');
    expect(result.commands).toContain('K15 【メイジスタッフ 打撃】');
  });
});
