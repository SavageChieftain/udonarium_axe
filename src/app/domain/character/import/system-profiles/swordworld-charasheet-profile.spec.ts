import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildSwordWorldCharasheetCharacter,
  isSwordWorldCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/swordworld-charasheet-profile';

describe('buildSwordWorldCharasheetCharacter', () => {
  // built from real data of the older edition of one system at the archive
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

  it('recognises it apart from the newer edition', () => {
    expect(isSwordWorldCharasheetCharacter(sw1)).toBe(true);
    expect(isSwordWorldCharasheetCharacter({ pc_name: 'X', game: 'swordworld2' })).toBe(false);
  });

  it('takes the ability bonuses, the two resources and the dice bot', () => {
    const result = buildSwordWorldCharasheetCharacter(sw1)!;
    expect(result.dicebot).toBe('SwordWorld');
    expect(result.params).toContainEqual({ label: '器用B', value: '3' });
    expect(result.statuses).toContainEqual({ label: 'HP', value: 17, max: 17 });
  });

  it('spreads the skills and the weapons with their names', () => {
    const result = buildSwordWorldCharasheetCharacter(sw1)!;
    expect(findSection(result.sections, '技能')!.groups.map((group) => group.label)).toEqual(['ソード']);
    expect(findSection(result.sections, '武器')!.groups.map((group) => group.label)).toEqual([
      'ヘビーメイス',
      'ダガー',
      'メイジスタッフ',
    ]);
  });

  it('marks a damage roll with its critical value only where that value makes sense', () => {
    const result = buildSwordWorldCharasheetCharacter(sw1)!;
    expect(result.commands).toContain('K18@12+1 【ヘビーメイス 打撃】');
    expect(result.commands).toContain('K5 【ダガー 打撃】');
    expect(result.commands).toContain('K15 【メイジスタッフ 打撃】');
  });
});
