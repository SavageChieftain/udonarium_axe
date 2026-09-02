import { parseAppspotCharacterForSystem } from '@axe/domain/character/import/system-profiles/appspot-profiles';
import { loadLabelMaps } from '@axe/domain/character/import/system-profiles/label-maps';

describe('parseAppspotCharacterForSystem', () => {
  beforeAll(() => loadLabelMaps());

  const dx3 = {
    base: { name: '六条' },
    baseAbility: { body: { total: '5' } },
    subAbility: { hp: { total: '31' } },
  };

  it('hands one system to its own profile', () => {
    const result = parseAppspotCharacterForSystem(dx3, 'dx3')!;
    expect(result.dicebot).toBe('DoubleCross');
    expect(result.params).toContainEqual({ label: '肉体', value: '5' });
  });

  it('hands another to its own', () => {
    const result = parseAppspotCharacterForSystem(
      { base: { name: 'かり' }, ninpou: [{ name: '接近戦攻撃', targetSkill: '掘削術' }] },
      'shinobigami'
    )!;
    expect(result.dicebot).toBe('ShinobiGami');
    expect(result.sections.some((section) => section.label === '忍法')).toBe(true);
  });

  it('hands a third to its own', () => {
    const result = parseAppspotCharacterForSystem(
      { base: { name: '深夜' }, ability: [{ name: '基本攻撃', targetSkill: '殴打' }] },
      'insane'
    )!;
    expect(result.dicebot).toBe('Insane');
    expect(result.sections.some((section) => section.label === 'アビリティ')).toBe(true);
  });

  it('still names the dice bot for a system with no profile', () => {
    const result = parseAppspotCharacterForSystem(dx3, 'mglg')!;
    expect(result.sourceFormat).toBe('appspot');
    expect(result.dicebot).toBe('MagicaLogia');
    // read by the general path, whose labels stay as they came
    expect(result.params.some((param) => param.label === 'body')).toBe(true);
  });

  it('reads pasted text with no system through the general path and names no dice bot', () => {
    const result = parseAppspotCharacterForSystem(dx3)!;
    expect(result.dicebot).toBe('');
  });

  it('returns nothing for anything but a warehouse character', () => {
    expect(parseAppspotCharacterForSystem({ foo: 'bar' }, 'dx3')).toBeNull();
  });
});
