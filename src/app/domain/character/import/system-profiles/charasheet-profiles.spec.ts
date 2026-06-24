import { parseCharasheetCharacterForSystem } from '@axe/domain/character/import/system-profiles/charasheet-profiles';

describe('parseCharasheetCharacterForSystem', () => {
  it('game="coc" は CoC6 プロファイルへ委譲する', () => {
    const result = parseCharasheetCharacterForSystem({
      pc_name: 'X',
      game: 'coc',
      NA1: 11,
      SAN_Max: 99,
      TBAD: ['34'],
      TBAP: ['74'],
    })!;
    expect(result.dicebot).toBe('Cthulhu');
    expect(result.sections.some((section) => section.label === '技能')).toBe(true);
  });

  it('game="coc7" は CoC7 プロファイルへ委譲する', () => {
    const result = parseCharasheetCharacterForSystem({
      pc_name: 'X',
      game: 'coc7',
      NA1: 60,
      SAN_Max: 99,
      SKAN: ['目星'],
      SKAP: ['50'],
      SKTP: ['1'],
    })!;
    expect(result.dicebot).toBe('Cthulhu7th');
    expect(result.params).toContainEqual({ label: 'STR', value: '60' });
    expect(result.sections.some((section) => section.label === '技能')).toBe(true);
  });

  it('未対応 game は汎用パースのまま dicebot 空', () => {
    const result = parseCharasheetCharacterForSystem({ pc_name: 'X', game: 'arianrhod', skillName: ['剣'] })!;
    expect(result.dicebot).toBe('');
  });

  it('汎用フォールバックでも生成ラベルマップで位置依存能力値をラベル付けする（このすば）', () => {
    const result = parseCharasheetCharacterForSystem({ pc_name: 'X', game: 'konosuba', NK1: '10' })!;
    const data = result.sections.find((section) => section.label === 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: '筋力', value: 10, kind: 'number' });
  });

  it('汎用フォールバックでも bcdice 収録系は正しい dicebot を付ける（ゴブスレ）', () => {
    const result = parseCharasheetCharacterForSystem({ pc_name: 'X', game: 'gobusla', effect_name: ['x'] })!;
    expect(result.dicebot).toBe('GoblinSlayer');
  });

  it('保管所キャラでなければ null', () => {
    expect(parseCharasheetCharacterForSystem({ kind: 'character' })).toBeNull();
  });
});
