import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildSwordWorld2CharasheetCharacter,
  isSwordWorld2CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/swordworld2-charasheet-profile';

describe('buildSwordWorld2CharasheetCharacter', () => {
  // charasheet.vampire-blood.net の ソードワールド2.0（game="swordworld2"）実データに即した構造
  const sw20 = {
    pc_name: 'ルゥ',
    game: 'swordworld2',
    color: '#226699',
    shuzoku: '人間',
    age: '17',
    sex: '女',
    HP: '28',
    MP: '20',
    NB1: '2',
    NB2: '1',
    NB3: '3',
    NB4: '2',
    NB5: '3',
    NB6: '3',
    ST_name: ['魔法拡大/数', '鷹の目', ''],
    ST_lv: ['1', '5', ''],
    ST_kouka: ['対象数+1', '', ''],
    arms_name: ['メイジスタッフ', ''],
    arms_cate: ['杖', ''],
    arms_hit: ['1', ''],
    arms_iryoku: ['11', ''],
    arms_critical: ['12', ''],
    arms_damage: ['2', ''],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('game="swordworld2" を判別する', () => {
    expect(isSwordWorld2CharasheetCharacter(sw20)).toBe(true);
    expect(isSwordWorld2CharasheetCharacter({ pc_name: 'X', game: 'swordworld' })).toBe(false);
  });

  it('能力ボーナス（標準順）・HP/MP・dicebot を取り込む', () => {
    const result = buildSwordWorld2CharasheetCharacter(sw20)!;
    expect(result.dicebot).toBe('SwordWorld2.0');
    expect(result.params).toContainEqual({ label: '器用B', value: '2' });
    expect(result.params).toContainEqual({ label: '生命力B', value: '2' });
    expect(result.params).toContainEqual({ label: '精神B', value: '3' });
    expect(result.statuses).toContainEqual({ label: 'HP', value: 28, max: 28 });
    expect(result.statuses).toContainEqual({ label: 'MP', value: 20, max: 20 });
  });

  it('技能・武器を名前付きで展開する', () => {
    const result = buildSwordWorld2CharasheetCharacter(sw20)!;
    expect(findSection(result.sections, '技能')!.groups.map((group) => group.label)).toEqual(['魔法拡大/数', '鷹の目']);
    const weapon = findSection(result.sections, '武器')!.groups[0];
    expect(weapon.label).toBe('メイジスタッフ');
    expect(weapon.fields).toContainEqual({ label: '威力', value: 11, kind: 'number' });
  });

  it('チャットパレットに能力判定と K式の打撃を生成する', () => {
    const result = buildSwordWorld2CharasheetCharacter(sw20)!;
    expect(result.commands).toContain('2d6+{器用B} 【器用判定】');
    expect(result.commands).toContain('K11@12+2 【メイジスタッフ 打撃】');
  });
});
