import { ImportedSection } from '@axe/domain/character/import/imported-character';
import {
  buildBbtAppspotCharacter,
  isBbtAppspotCharacter,
} from '@axe/domain/character/import/system-profiles/bbt-appspot-profile';

describe('buildBbtAppspotCharacter', () => {
  // character-sheets.appspot.com の bbt（ビーストバインド トリニティ）実データに即した構造
  const bbt = {
    base: {
      name: '九十九 八重',
      race: '人間',
      bloods: 'ヴァンパイア',
      style: '隠密',
      cover: '学生',
      age: '17',
      sex: '女',
      player: 'PL',
      memo: 'メモ',
    },
    baseAbility: {
      body: { total: '5' },
      emotion: { total: '6' },
      skill: { total: '5' },
      society: { total: '7' },
      divine: { total: '3' },
    },
    humanity: { total: '57' },
    fp: { total: '36' },
    arts: [
      {
        name: '吸血',
        type: '通常',
        level: '1',
        timing: 'メジャー',
        target: '単体',
        range: '至近',
        cost: '5',
        notes: 'HP吸収',
      },
    ],
    weapons: [{ name: '牙', type: '白兵', attack: '2', guard: '0', attribute: '物理', range: '至近' }],
    binds: [{ name: '相棒', type: '信頼', relation: '友情' }],
    outline: '設定',
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  function findGroupFields(section: ImportedSection, groupLabel: string) {
    return section.groups.find((group) => group.label === groupLabel)?.fields ?? [];
  }

  it('倉庫 ビーストバインドの構造を判別する', () => {
    expect(isBbtAppspotCharacter(bbt)).toBe(true);
    expect(isBbtAppspotCharacter({ base: { name: 'X' }, baseAbility: { body: { total: '5' } } })).toBe(false);
  });

  it('能力値・FP を params、人間性をリソース、dicebot を取り込む', () => {
    const result = buildBbtAppspotCharacter(bbt)!;
    expect(result.dicebot).toBe('BeastBindTrinity');
    expect(result.params).toContainEqual({ label: '肉体', value: '5' });
    expect(result.params).toContainEqual({ label: '社会', value: '7' });
    expect(result.params).toContainEqual({ label: '神威', value: '3' });
    expect(result.params).toContainEqual({ label: 'FP', value: '36' });
    expect(result.statuses).toContainEqual({ label: '人間性', value: 57, max: 57 });
  });

  it('エフェクト・武器・絆・プロフィールを日本語ラベルで展開する', () => {
    const result = buildBbtAppspotCharacter(bbt)!;
    expect(findGroupFields(findSection(result.sections, 'エフェクト')!, '吸血')).toContainEqual({
      label: 'タイミング',
      value: 'メジャー',
      kind: 'text',
    });
    expect(findGroupFields(findSection(result.sections, '武器')!, '牙')).toContainEqual({
      label: '攻撃',
      value: 2,
      kind: 'number',
    });
    expect(findGroupFields(findSection(result.sections, '絆')!, '相棒')).toContainEqual({
      label: '関係',
      value: '友情',
      kind: 'text',
    });
    expect(findGroupFields(findSection(result.sections, 'プロフィール')!, '基本')).toContainEqual({
      label: 'スタイル',
      value: '隠密',
      kind: 'text',
    });
  });

  it('チャットパレットに 2D6+能力値 の判定を生成する', () => {
    const result = buildBbtAppspotCharacter(bbt)!;
    expect(result.commands).toContain('2D6+{社会} 【社会判定】');
    expect(result.commands).toContain('2D6+{肉体} 【肉体判定】');
  });
});
