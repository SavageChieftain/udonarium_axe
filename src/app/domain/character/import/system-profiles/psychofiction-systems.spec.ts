import { parseAppspotCharacterForSystem } from '@axe/domain/character/import/system-profiles/appspot-profiles';

describe('PF_APPSPOT_SYSTEMS (registry-driven psycho-fiction imports)', () => {
  it('helltv（キルデスビジネス）を特技表・アビリティ・dicebot つきで取り込む', () => {
    const result = parseAppspotCharacterForSystem(
      {
        base: { name: '殺し屋' },
        ability: [{ name: '必殺技', targetSkill: '撃つ', level: '2', effect: '即死' }],
        learned: [{ id: 'skills.row5.name0' }],
        skills: { a: '1' },
      },
      'helltv'
    )!;
    expect(result.dicebot).toBe('KillDeathBusiness');
    expect(result.sections.some((section) => section.label === 'アビリティ')).toBe(true);

    const table = result.skillTables[0];
    expect(table.categories).toEqual(['職業', '動作', '小道具', '衣装', '情動', '願望']);
    // 職業の6行目（row5）＝悪漢
    expect(table.skillsByCategory[0][5]).toBe('悪漢');
    expect(table.checked![0][5]).toBe(true);
    expect(table.gaps).toEqual([true, false, false, false, false, false]);

    expect(result.commands).toContain('2D6>=5 【必殺技／撃つ】');
  });

  it('hm（ハンターズムーン）を body-part 特技表・アビリティ・dicebot つきで取り込む', () => {
    const result = parseAppspotCharacterForSystem(
      {
        base: { name: 'ハンター' },
        ability: [{ name: '噛みつき', targetSkill: '噛む', type: '攻撃' }],
        learned: [{ id: 'skills.row0.name1' }],
      },
      'hm'
    )!;
    expect(result.dicebot).toBe('HuntersMoon');
    const table = result.skillTables[0];
    expect(table.categories).toEqual(['社会', '頭部', '腕部', '胴部', '脚部', '環境']);
    expect(table.skillsByCategory[1][0]).toBe('聴く'); // 頭部 row0
    expect(table.checked![1][0]).toBe(true);
    expect(result.commands).toContain('2D6>=5 【噛みつき／噛む】');
  });

  it('cardranker（カードランカー）は cardlist/skill を指定特技として扱う', () => {
    const result = parseAppspotCharacterForSystem(
      {
        base: { name: 'ランカー' },
        cardlist: [{ name: '白竜ブレス', skill: '白竜', type: '攻撃' }],
        learned: [{ id: 'skills.row0.name0' }],
      },
      'cardranker'
    )!;
    expect(result.dicebot).toBe('CardRanker');
    expect(result.sections.some((section) => section.label === 'カード')).toBe(true);
    expect(result.skillTables[0].skillsByCategory[0][0]).toBe('白竜');
    expect(result.commands).toContain('2D6>=5 【白竜ブレス／白竜】');
  });

  it('starrydolls（スタリィドール）は spells/skill を指定特技として扱う', () => {
    const result = parseAppspotCharacterForSystem(
      {
        base: { name: '星子' },
        spells: [{ name: '光の矢', skill: '光', timing: 'メジャー' }],
        learned: [{ id: 'skills.row0.name1' }],
      },
      'starrydolls'
    )!;
    expect(result.dicebot).toBe('StarryDolls');
    expect(result.sections.some((section) => section.label === '呪文')).toBe(true);
    expect(result.skillTables[0].skillsByCategory[1][0]).toBe('光'); // 元素 row0
    expect(result.commands).toContain('2D6>=5 【光の矢／光】');
  });
});
