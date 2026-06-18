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
    learned: [{ id: 'skills.row10.name0' }, { id: 'skills.row3.name3' }],
    skills: { a: '1', b: null, c: null, d: null, e: null, f: '1' },
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

  it('特技表（GAP表）を正式特技表で構築し、learned から習得・a-f からギャップを反映する', () => {
    const result = buildShinobigamiAppspotCharacter(sg)!;
    const table = result.skillTables[0];
    expect(table.name).toBe('特技表');
    expect(table.categories).toEqual(['器術', '体術', '忍術', '謀術', '戦術', '妖術']);
    // 器術の12行目（row10）＝掘削術
    expect(table.skillsByCategory[0][10]).toBe('掘削術');
    // learned: skills.row10.name0（器術=掘削術）/ skills.row3.name3（謀術=調査術）
    expect(table.checked![0][10]).toBe(true);
    expect(table.checked![3][3]).toBe(true);
    expect(table.checked![0][0]).toBe(false);
    // gaps a-f → [器-体, 体-忍, 忍-謀, 謀-戦, 戦-妖, 妖-器(wrap)]
    expect(table.gaps).toEqual([true, false, false, false, false, true]);
  });
});
