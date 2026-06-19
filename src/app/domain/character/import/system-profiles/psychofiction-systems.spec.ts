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
});
