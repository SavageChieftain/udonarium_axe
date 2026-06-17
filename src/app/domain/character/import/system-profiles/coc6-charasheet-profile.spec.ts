import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildCoc6CharasheetCharacter,
  isCoc6CharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/coc6-charasheet-profile';

describe('buildCoc6CharasheetCharacter', () => {
  // charasheet.vampire-blood.net の CoC（game="coc"）実データに即した構造
  const coc = {
    pc_name: '探索者すー',
    game: 'coc',
    color: '#2266aa',
    pc_making_environ: '作成メモ',
    age: '24',
    NA1: 11,
    NA2: 12,
    NA3: 16,
    NA4: 17,
    NA5: 10,
    NA6: 13,
    NA7: 13,
    NA8: 17,
    NA9: 11,
    NA10: 16,
    NA11: 80,
    NA12: 65,
    NA13: 80,
    NA14: 85,
    NP1: 11,
    SAN_Max: 99,
    SAN_Left: '80',
    SAN_Danger: 64,
    dmg_bonus: '1d4',
    TBAD: ['34', '25', '25', '50', '25', '25', '20', '20', '30', '30', '30', '25'],
    TBAP: ['74', '25', '25', '50', '25', '25', '20', '20', '30', '30', '30', '25'],
    TFAD: ['30', '1', '15', '10', '25', '10', '10', '1', '10', '40', '25', '25'],
    TFAP: ['30', '1', '15', '10', '25', '10', '10', '1', '10', '40', '25', '75'],
    TCAD: ['5', '15', '15', '5', '60', '1'],
    TCAP: ['5', '15', '15', '5', '60', '70'],
    TCAName: ['威圧'],
    arms_name: ['ナイフ', ''],
    arms_hit: ['50', ''],
    arms_damage: ['1d4+db', ''],
    item_name: ['財布', ''],
    item_num: ['1', ''],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('game="coc" のみを CoC6 として判別する', () => {
    expect(isCoc6CharasheetCharacter(coc)).toBe(true);
    expect(isCoc6CharasheetCharacter({ pc_name: 'X', game: 'coc7' })).toBe(false);
    expect(isCoc6CharasheetCharacter({ pc_name: 'X', game: 'arianrhod' })).toBe(false);
    expect(isCoc6CharasheetCharacter({ kind: 'character' })).toBe(false);
  });

  it('名前・色・メモ・dicebot を取り込む', () => {
    const result = buildCoc6CharasheetCharacter(coc)!;
    expect(result.sourceFormat).toBe('charasheet');
    expect(result.name).toBe('探索者すー');
    expect(result.color).toBe('#2266aa');
    expect(result.memo).toBe('作成メモ');
    expect(result.dicebot).toBe('Cthulhu');
  });

  it('能力値と派生値を params に、HP/MP は params に出さない', () => {
    const result = buildCoc6CharasheetCharacter(coc)!;
    expect(result.params).toContainEqual({ label: 'STR', value: '11' });
    expect(result.params).toContainEqual({ label: 'EDU', value: '17' });
    expect(result.params).toContainEqual({ label: 'アイデア', value: '65' });
    expect(result.params).toContainEqual({ label: '幸運', value: '80' });
    expect(result.params).toContainEqual({ label: '知識', value: '85' });
    expect(result.params.some((param) => param.label === 'HP')).toBe(false);
    expect(result.params.some((param) => param.label === 'MP')).toBe(false);
  });

  it('正気度・HP・MP を現在/最大リソースとして取り込む', () => {
    const result = buildCoc6CharasheetCharacter(coc)!;
    expect(result.statuses).toContainEqual({ label: '正気度', value: 80, max: 99 });
    expect(result.statuses).toContainEqual({ label: 'HP', value: 11, max: 11 });
    expect(result.statuses).toContainEqual({ label: 'MP', value: 16, max: 16 });
  });

  it('技能を固定枠の名前＋カスタム名で合計値フィールドに展開する', () => {
    const result = buildCoc6CharasheetCharacter(coc)!;
    const skills = findSection(result.sections, '技能')!;
    expect(skills).toBeTruthy();

    const combat = findGroupFields(skills, '戦闘技能');
    expect(combat).toContainEqual({ label: '回避', value: 74, kind: 'number' });
    expect(combat).toContainEqual({ label: 'こぶし(パンチ)', value: 50, kind: 'number' });

    const search = findGroupFields(skills, '探索技能');
    expect(search).toContainEqual({ label: '目星', value: 75, kind: 'number' });

    const negotiation = findGroupFields(skills, '交渉技能');
    expect(negotiation).toContainEqual({ label: '威圧', value: 70, kind: 'number' });
  });

  it('武器・所持品を名前付きグループに展開する', () => {
    const result = buildCoc6CharasheetCharacter(coc)!;
    const weapons = findSection(result.sections, '武器')!;
    expect(weapons.groups.map((group) => group.label)).toEqual(['ナイフ']);
    expect(findGroupFields(weapons, 'ナイフ')).toContainEqual({ label: 'ダメージ', value: '1d4+db', kind: 'text' });

    const items = findSection(result.sections, '所持品')!;
    expect(items.groups.map((group) => group.label)).toEqual(['財布']);
  });

  it('能力値・技能配列・複製列は「その他」へ漏らさず、素のプロフィール項目だけ残す', () => {
    const result = buildCoc6CharasheetCharacter(coc)!;
    const other = findSection(result.sections, 'その他');
    const labels = other ? other.groups[0].fields.map((field) => field.label) : [];
    expect(labels).toContain('age');
    expect(labels).not.toContain('NA1');
    expect(labels).not.toContain('NP1');
    expect(labels).not.toContain('TBAD');
    expect(labels).not.toContain('arms_name');
  });

  it('チャットパレットに能力値・SAN・全技能（初期値どまりも含む）・ダメージボーナスのロールを生成する', () => {
    const result = buildCoc6CharasheetCharacter(coc)!;
    expect(result.commands).toContain('CCB<={STR}*5 【STR】');
    expect(result.commands).toContain('CCB<={アイデア} 【アイデア】');
    expect(result.commands).toContain('CCB<={正気度} 【正気度ロール】');
    expect(result.commands).toContain('CCB<={回避} 【回避】');
    expect(result.commands).toContain('CCB<={目星} 【目星】');
    expect(result.commands).toContain('CCB<={威圧} 【威圧】');
    expect(result.commands).toContain('1d4 【ダメージボーナス】');
    expect(result.commands).toContain('CCB<={キック} 【キック】');
    expect(result.commands).toContain('CCB<={母国語} 【母国語】');
  });
});
