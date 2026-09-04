import { parseCharasheetCharacterForSystem } from '@axe/domain/character/import/system-profiles/charasheet-profiles';
import { loadLabelMaps } from '@axe/domain/character/import/system-profiles/label-maps';

describe('parseCharasheetCharacterForSystem', () => {
  beforeAll(() => loadLabelMaps());

  it('hands one edition to its own profile', () => {
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

  it('hands the later one to its own', () => {
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

  it('reads an unsupported system through the general path and names no dice bot', () => {
    const result = parseCharasheetCharacterForSystem({ pc_name: 'X', game: 'arianrhod', skillName: ['剣'] })!;
    expect(result.dicebot).toBe('');
  });

  it('labels the positional abilities from the generated map even on the general path', () => {
    const result = parseCharasheetCharacterForSystem({ pc_name: 'X', game: 'konosuba', NK1: '10' })!;
    const data = result.sections.find((section) => section.label === 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: '筋力', value: 10, kind: 'number' });
  });

  it('still names the right dice bot there for a system the library carries', () => {
    const result = parseCharasheetCharacterForSystem({ pc_name: 'X', game: 'gobusla', effect_name: ['x'] })!;
    expect(result.dicebot).toBe('GoblinSlayer');
  });

  it('returns nothing for anything but an archive character', () => {
    expect(parseCharasheetCharacterForSystem({ kind: 'character' })).toBeNull();
  });
});
