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

  it('kancolle（艦これRPG）を特技表・能力・装備つきで取り込み、装備配列を落とさない', () => {
    const result = parseAppspotCharacterForSystem(
      {
        base: { name: '不知火', nameKana: '駆逐艦', level: '1', actionpoint: '17' },
        ability: [{ name: '不知火に落ち度でも？', targetSkill: 'なし', type: '固有', effect: '再挑戦に+1' }],
        outfits: [{ name: '小口径主砲', type: '装備', targetSkill: '古風', range: '短', aim: '0', fire: '2' }],
        personality: [{ name: null, attribute: null, emotion: null, cheer: null }],
        learned: [{ id: 'skills.row3.name0' }, { id: 'skills.row1.name1' }],
        skills: { e: '1' },
      },
      'kancolle'
    )!;
    expect(result.dicebot).toBe('KanColle');
    expect(result.name).toBe('不知火');

    const table = result.skillTables[0];
    expect(table.categories).toEqual(['背景', '魅力', '性格', '趣味', '航海', '戦闘']);
    expect(table.skillsByCategory[0][3]).toBe('古風'); // 背景 row3
    expect(table.checked![0][3]).toBe(true);
    expect(table.checked![1][1]).toBe(true); // 魅力 row1
    expect(table.gaps).toEqual([false, false, false, false, true, false]);

    // 能力・装備の両方がセクション化され、装備（outfits）を取りこぼさない
    expect(result.sections.some((section) => section.label === '能力')).toBe(true);
    const outfits = result.sections.find((section) => section.label === '装備')!;
    expect(outfits.groups[0].label).toBe('小口径主砲');
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
