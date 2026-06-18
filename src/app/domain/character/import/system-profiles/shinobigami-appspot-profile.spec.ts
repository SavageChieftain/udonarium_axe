import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildShinobigamiAppspotCharacter,
  isShinobigamiAppspotCharacter,
} from '@axe/domain/character/import/system-profiles/shinobigami-appspot-profile';

describe('buildShinobigamiAppspotCharacter', () => {
  // character-sheets.appspot.com の shinobigami（シノビガミ）実データに即した構造
  const sg = {
    base: {
      name: 'かり',
      nameKana: 'かり',
      cover: '高校生',
      level: '中忍',
      exp: '5',
      age: '17',
      sex: '女',
      memo: 'メモ文',
    },
    ninpou: [
      {
        name: '接近戦攻撃',
        type: '攻撃',
        targetSkill: '掘削術',
        range: '1',
        cost: '0',
        effect: '接近戦ダメージを１点与える。',
        page: '基78',
      },
      { name: '', type: null, targetSkill: null },
    ],
    background: [{ name: '整備班', type: '長所', point: '3', effect: 'サポート忍法を自動成功にさせられる。' }],
    outline: '設定テキスト',
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('倉庫 シノビガミの構造を判別する', () => {
    expect(isShinobigamiAppspotCharacter(sg)).toBe(true);
    expect(isShinobigamiAppspotCharacter({ kind: 'character' })).toBe(false);
  });

  it('名前・メモ・dicebot を取り込む', () => {
    const result = buildShinobigamiAppspotCharacter(sg)!;
    expect(result.sourceFormat).toBe('appspot');
    expect(result.name).toBe('かり');
    expect(result.memo).toBe('メモ文');
    expect(result.dicebot).toBe('ShinobiGami');
  });

  it('忍法を指定特技つきの名前付きグループに展開する（空の忍法はスキップ）', () => {
    const result = buildShinobigamiAppspotCharacter(sg)!;
    const ninpou = findSection(result.sections, '忍法')!;
    expect(ninpou.groups.map((group) => group.label)).toEqual(['接近戦攻撃']);
    const fields = findGroupFields(ninpou, '接近戦攻撃');
    expect(fields).toContainEqual({ label: '指定特技', value: '掘削術', kind: 'text' });
    expect(fields).toContainEqual({ label: '種別', value: '攻撃', kind: 'text' });
    expect(fields).toContainEqual({ label: '間合', value: 1, kind: 'number' });
  });

  it('背景・プロフィールを日本語ラベルでセクション化する', () => {
    const result = buildShinobigamiAppspotCharacter(sg)!;
    expect(findGroupFields(findSection(result.sections, '背景')!, '整備班')).toContainEqual({
      label: '功績',
      value: 3,
      kind: 'number',
    });
    const profile = findSection(result.sections, 'プロフィール')!;
    expect(findGroupFields(profile, '基本')).toContainEqual({ label: '表の顔', value: '高校生', kind: 'text' });
    expect(findGroupFields(profile, '基本')).toContainEqual({ label: '階級', value: '中忍', kind: 'text' });
  });

  it('チャットパレットは ShinobiGami の 2D6>=5 で忍法（指定特技つき）の判定を生成する', () => {
    const result = buildShinobigamiAppspotCharacter(sg)!;
    expect(result.commands).toContain('2D6>=5 【判定】');
    expect(result.commands).toContain('2D6>=5 【接近戦攻撃／掘削術】');
  });
});
