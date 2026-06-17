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

  it('プロファイル未対応でも dicebot だけは補完する（coc7 → Cthulhu7th）', () => {
    const result = parseCharasheetCharacterForSystem({ pc_name: 'X', game: 'coc7', NA1: 11 })!;
    expect(result.sourceFormat).toBe('charasheet');
    expect(result.dicebot).toBe('Cthulhu7th');
  });

  it('未対応 game は汎用パースのまま dicebot 空', () => {
    const result = parseCharasheetCharacterForSystem({ pc_name: 'X', game: 'arianrhod', skillName: ['剣'] })!;
    expect(result.dicebot).toBe('');
  });

  it('保管所キャラでなければ null', () => {
    expect(parseCharasheetCharacterForSystem({ kind: 'character' })).toBeNull();
  });
});
