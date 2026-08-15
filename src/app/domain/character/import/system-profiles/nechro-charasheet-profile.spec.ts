import {
  buildNechroCharasheetCharacter,
  isNechroCharasheetCharacter,
} from '@axe/domain/character/import/system-profiles/nechro-charasheet-profile';

describe('one system at the archive', () => {
  const sample = {
    pc_name: 'ケイティー',
    game: 'nechro',
    Position_Name: 'ソロリティ',
    MCLS_Name: 'ロマネスク',
    SCLS_Name: 'タナトス',
    Power_name: ['号令', '死の舞踏'],
    Power_shozoku: ['メイン', '基本パーツ'],
    Power_Type: ['2', '5'],
    Power_cost: ['2', 'なし'],
    Power_range: ['自身', '0'],
    Power_memo: ['味方を支援する', '隣接に白兵攻撃'],
    Power_timing: ['1', '3'],
    roice_name: ['たからもの', '友'],
    roice_neg: ['幼児退行', '依存'],
    roice_damage: ['3', '1'],
  };

  it('recognises the system', () => {
    expect(isNechroCharasheetCharacter(sample)).toBe(true);
    expect(isNechroCharasheetCharacter({ pc_name: 'x', game: 'coc' })).toBe(false);
  });

  it('takes the name and the dice bot', () => {
    const result = buildNechroCharasheetCharacter(sample)!;
    expect(result.name).toBe('ケイティー');
    expect(result.dicebot).toBe('Nechronica');
    expect(result.commands).toContain('2NC 【判定】');
  });

  it('spreads the manoeuvres into named sections, reading the part and timing codes through the map taken from its own page', () => {
    const result = buildNechroCharasheetCharacter(sample)!;
    const maneuver = result.sections.find((section) => section.label === 'マニューバ')!;
    expect(maneuver.groups[0].label).toBe('号令');
    expect(maneuver.groups[0].fields).toContainEqual({ label: '分類', value: 'メイン', kind: 'text' });
    expect(maneuver.groups[0].fields).toContainEqual({ label: '効果', value: '味方を支援する', kind: 'text' });
    expect(maneuver.groups[0].fields).toContainEqual({ label: '部位', value: 'メインクラス', kind: 'text' });
    expect(maneuver.groups[0].fields).toContainEqual({ label: 'タイミング', value: 'アクション', kind: 'text' });
    expect(maneuver.groups[1].fields).toContainEqual({ label: '部位', value: '腕', kind: 'text' });
    expect(maneuver.groups[1].fields).toContainEqual({ label: 'タイミング', value: 'ダメージ', kind: 'text' });
  });

  it('takes each attachment with its subject, its damage and its feeling', () => {
    const result = buildNechroCharasheetCharacter(sample)!;
    const roice = result.sections.find((section) => section.label === '未練')!;
    expect(roice.groups[0].label).toBe('たからもの');
    expect(roice.groups[0].fields).toContainEqual({ label: '負の感情', value: '幼児退行', kind: 'text' });
    expect(roice.groups[0].fields).toContainEqual({ label: '損傷', value: 3, kind: 'number' });
  });

  it('puts the position and the class into the profile', () => {
    const result = buildNechroCharasheetCharacter(sample)!;
    const profile = result.sections.find((section) => section.label === 'プロフィール')!;
    expect(profile.groups[0].fields).toContainEqual({ label: 'ポジション', value: 'ソロリティ', kind: 'text' });
    expect(profile.groups[0].fields).toContainEqual({ label: 'メインクラス', value: 'ロマネスク', kind: 'text' });
  });
});
