import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildUtakazeCharasheetCharacter,
  isUtakazeCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/utakaze-charasheet-profile';

describe('buildUtakazeCharasheetCharacter', () => {
  // charasheet.vampire-blood.net の ウタカゼ（game="utakaze"）実データに即した構造
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

  it('game="utakaze" を判別する', () => {
    expect(isUtakazeCharasheetCharacter(utakaze)).toBe(true);
    expect(isUtakazeCharasheetCharacter({ pc_name: 'X', game: 'coc' })).toBe(false);
  });

  it('4 能力値（勇気/知恵/愛情/希望）と dicebot Utakaze を取り込む', () => {
    const result = buildUtakazeCharasheetCharacter(utakaze)!;
    expect(result.dicebot).toBe('Utakaze');
    expect(result.params).toEqual([
      { label: '勇気', value: '5' },
      { label: '知恵', value: '2' },
      { label: '愛情', value: '3' },
      { label: '希望', value: '6' },
    ]);
  });

  it('特技・仲間を名前付きで展開する', () => {
    const result = buildUtakazeCharasheetCharacter(utakaze)!;
    expect(findSection(result.sections, '特技')!.groups.map((group) => group.label)).toEqual(['風使い']);
    expect(findSection(result.sections, '仲間')!.groups.map((group) => group.label)).toEqual(['スカイア', 'プレ']);
  });

  it('チャットパレットに能力値ぶんの nUK 行為判定を生成する', () => {
    const result = buildUtakazeCharasheetCharacter(utakaze)!;
    expect(result.commands).toContain('5UK 【勇気】');
    expect(result.commands).toContain('6UK 【希望】');
  });
});
