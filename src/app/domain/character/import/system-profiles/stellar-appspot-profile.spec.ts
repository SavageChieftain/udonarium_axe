import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildStellarAppspotCharacter,
  isStellarAppspotCharacter,
} from '@axe/domain/character/import/system-profiles/stellar-appspot-profile';

describe('buildStellarAppspotCharacter', () => {
  // built from real data of one system at the warehouse
  const stellar = {
    base: {
      name: 'ノヴァ',
      knight: '黒の騎士',
      organization: '夜会',
      character: 'クール',
      keyword: '復讐',
      wish: '世界の平和',
      age: '17',
      sex: '女',
      player: 'PL',
      yourstory: '設定テキスト',
    },
    status: { charge: '3', defense: '3', hp: '16', medal: null, resonance: null },
    skills: [
      { name: '騎士のたしなみ', type: 'アタック／ムーヴ', timing: 'あなたのターン', effect: 'アタック判定を行う' },
    ],
    sheath: [{ name: '銀の剣', type: '武器', timing: 'メジャー', effect: '斬撃' }],
    outline: 'シナリオ用',
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('recognises the system', () => {
    expect(isStellarAppspotCharacter(stellar)).toBe(true);
    expect(isStellarAppspotCharacter({ kind: 'character' })).toBe(false);
  });

  it('takes the name, the dice bot, the health and the statuses', () => {
    const result = buildStellarAppspotCharacter(stellar)!;
    expect(result.sourceFormat).toBe('appspot');
    expect(result.name).toBe('ノヴァ');
    expect(result.dicebot).toBe('StellarKnights');
    expect(result.statuses).toContainEqual({ label: 'HP', value: 16, max: 16 });
    expect(result.params).toContainEqual({ label: '防御', value: '3' });
    expect(result.params).toContainEqual({ label: 'チャージ', value: '3' });
    // leaves an empty status off
    expect(result.params.some((param) => param.label === 'メダル')).toBe(false);
  });

  it('spreads the skills, the sheaths and the profile under readable labels', () => {
    const result = buildStellarAppspotCharacter(stellar)!;
    expect(findGroupFields(findSection(result.sections, 'スキル')!, '騎士のたしなみ')).toContainEqual({
      label: 'タイミング',
      value: 'あなたのターン',
      kind: 'text',
    });
    expect(findSection(result.sections, '鞘')!.groups.map((group) => group.label)).toEqual(['銀の剣']);
    expect(findGroupFields(findSection(result.sections, 'プロフィール')!, '基本')).toContainEqual({
      label: '騎士',
      value: '黒の騎士',
      kind: 'text',
    });
  });

  it('builds the attack roll of that system into the palette', () => {
    const result = buildStellarAppspotCharacter(stellar)!;
    expect(result.commands).toContain('2SK 【アタック判定:2ダイス】');
    expect(result.commands).toContain('5SK 【アタック判定:5ダイス】');
  });
});
