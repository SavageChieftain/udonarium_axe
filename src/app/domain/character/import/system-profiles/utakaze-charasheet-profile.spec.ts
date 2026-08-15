import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildUtakazeCharasheetCharacter,
  isUtakazeCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/utakaze-charasheet-profile';

describe('buildUtakazeCharasheetCharacter', () => {
  // built from real data of one system at the archive
  const utakaze = {
    pc_name: 'リル',
    game: 'utakaze',
    race: 'コビット',
    N_Yuuki: '5',
    N_Chie: '2',
    N_Aijou: '3',
    N_Kibou: '6',
    skill_name: ['風使い', ''],
    skill_sl: ['2', ''],
    skill_timing: ['アクション', ''],
    skill_memo: ['風を操る', ''],
    friend_name: ['スカイア', 'プレ'],
    friend_lv: ['2', '1'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('recognises the system', () => {
    expect(isUtakazeCharasheetCharacter(utakaze)).toBe(true);
    expect(isUtakazeCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('takes its four abilities and the dice bot', () => {
    const result = buildUtakazeCharasheetCharacter(utakaze)!;
    expect(result.dicebot).toBe('Utakaze');
    expect(result.params).toEqual([
      { label: '勇気', value: '5' },
      { label: '知恵', value: '2' },
      { label: '愛情', value: '3' },
      { label: '希望', value: '6' },
    ]);
  });

  it('spreads the talents and the companions with their names', () => {
    const result = buildUtakazeCharasheetCharacter(utakaze)!;
    expect(findSection(result.sections, '特技')!.groups.map((group) => group.label)).toEqual(['風使い']);
    expect(findSection(result.sections, '仲間')!.groups.map((group) => group.label)).toEqual(['スカイア', 'プレ']);
  });

  it('builds a roll of each ability into the palette', () => {
    const result = buildUtakazeCharasheetCharacter(utakaze)!;
    expect(result.commands).toContain('5UK 【勇気】');
    expect(result.commands).toContain('6UK 【希望】');
  });
});
