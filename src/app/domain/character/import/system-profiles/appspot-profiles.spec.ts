import { parseAppspotCharacterForSystem } from '@axe/domain/character/import/system-profiles/appspot-profiles';

describe('parseAppspotCharacterForSystem', () => {
  const dx3 = {
    base: { name: '六条' },
    baseAbility: { body: { total: '5' } },
    subAbility: { hp: { total: '31' } },
  };

  it('slug="dx3" は DX3 プロファイルへ委譲する', () => {
    const result = parseAppspotCharacterForSystem(dx3, 'dx3')!;
    expect(result.dicebot).toBe('DoubleCross');
    expect(result.params).toContainEqual({ label: '肉体', value: '5' });
  });

  it('slug="shinobigami" は シノビガミ プロファイルへ委譲する', () => {
    const result = parseAppspotCharacterForSystem(
      { base: { name: 'かり' }, ninpou: [{ name: '接近戦攻撃', targetSkill: '掘削術' }] },
      'shinobigami'
    )!;
    expect(result.dicebot).toBe('ShinobiGami');
    expect(result.sections.some((section) => section.label === '忍法')).toBe(true);
  });

  it('slug="insane" は インセイン プロファイルへ委譲する', () => {
    const result = parseAppspotCharacterForSystem(
      { base: { name: '深夜' }, ability: [{ name: '基本攻撃', targetSkill: '殴打' }] },
      'insane'
    )!;
    expect(result.dicebot).toBe('Insane');
    expect(result.sections.some((section) => section.label === 'アビリティ')).toBe(true);
  });

  it('プロファイル未対応 slug でも dicebot は補完する（mglg → MagicaLogia）', () => {
    const result = parseAppspotCharacterForSystem(dx3, 'mglg')!;
    expect(result.sourceFormat).toBe('appspot');
    expect(result.dicebot).toBe('MagicaLogia');
    // プロファイル未対応なので汎用パース（英語ラベル）
    expect(result.params.some((param) => param.label === 'body')).toBe(true);
  });

  it('slug 無し（テキスト貼り付け等）は汎用パースのまま dicebot 空', () => {
    const result = parseAppspotCharacterForSystem(dx3)!;
    expect(result.dicebot).toBe('');
  });

  it('倉庫キャラでなければ null', () => {
    expect(parseAppspotCharacterForSystem({ foo: 'bar' }, 'dx3')).toBeNull();
  });
});
