import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildStellarAppspotCharacter,
  isStellarAppspotCharacter,
} from '@axe/domain/character/import/system-profiles/stellar-appspot-profile';

describe('buildStellarAppspotCharacter', () => {
  // character-sheets.appspot.com の stellar（銀剣のステラナイツ）実データに即した構造
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

  it('倉庫 ステラナイツの構造を判別する', () => {
    expect(isStellarAppspotCharacter(stellar)).toBe(true);
    expect(isStellarAppspotCharacter({ kind: 'character' })).toBe(false);
  });

  it('名前・dicebot・HP・ステータスを取り込む', () => {
    const result = buildStellarAppspotCharacter(stellar)!;
    expect(result.sourceFormat).toBe('appspot');
    expect(result.name).toBe('ノヴァ');
    expect(result.dicebot).toBe('StellarKnights');
    expect(result.statuses).toContainEqual({ label: 'HP', value: 16, max: 16 });
    expect(result.params).toContainEqual({ label: '防御', value: '3' });
    expect(result.params).toContainEqual({ label: 'チャージ', value: '3' });
    // null のステータス（メダル/共鳴）は出さない
    expect(result.params.some((param) => param.label === 'メダル')).toBe(false);
  });

  it('スキル・鞘・プロフィールを日本語ラベルで展開する', () => {
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

  it('チャットパレットに StellarKnights の nSK アタック判定を生成する', () => {
    const result = buildStellarAppspotCharacter(stellar)!;
    expect(result.commands).toContain('2SK 【アタック判定:2ダイス】');
    expect(result.commands).toContain('5SK 【アタック判定:5ダイス】');
  });
});
