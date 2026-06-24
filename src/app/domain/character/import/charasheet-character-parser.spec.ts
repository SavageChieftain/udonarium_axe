import { parseCharasheetCharacter } from '@axe/domain/character/import/charasheet-character-parser';
import { ImportedSection } from '@axe/domain/character/import/imported-character';

describe('parseCharasheetCharacter', () => {
  // charasheet.vampire-blood.net の CoC（game="coc"）実データに即した構造
  const coc = {
    pc_name: 'すー',
    game: 'coc',
    color: '#2266aa',
    pc_making_environ: '作成メモ',
    NA1: 10,
    NA2: 8,
    NA3: 12,
    NA4: 13,
    NA5: 15,
    NA6: 12,
    NA7: 10,
    NA8: 13,
    NA9: 10,
    NA10: 12,
    SAN_Left: '',
    SAN_Max: 99,
    SAN_Danger: 0,
    TS_Total: 260,
    TBAD: ['26', '25', '', ''],
    TBAP: ['26', '', '', ''],
    TBAS: ['', '', '', ''],
    TKAD: ['5', '1', '10'],
    TKAP: ['60', '', '20'],
  };

  function findSection(sections: ImportedSection[], label: string): ImportedSection | undefined {
    return sections.find((section) => section.label === label);
  }

  it('保管所キャラを判別する', () => {
    expect(parseCharasheetCharacter(coc)).not.toBeNull();
    expect(parseCharasheetCharacter({ kind: 'character' })).toBeNull();
  });

  it('名前・色・メモを取り込む', () => {
    const result = parseCharasheetCharacter(coc)!;
    expect(result.sourceFormat).toBe('charasheet');
    expect(result.name).toBe('すー');
    expect(result.color).toBe('#2266aa');
    expect(result.memo).toBe('作成メモ');
  });

  it('CoC の能力値 NA1..NA8 を STR..EDU として取り込む', () => {
    const result = parseCharasheetCharacter(coc)!;
    expect(result.params).toContainEqual({ label: 'STR', value: '10' });
    expect(result.params).toContainEqual({ label: 'CON', value: '8' });
    expect(result.params).toContainEqual({ label: 'EDU', value: '13' });
    expect(result.params).toContainEqual({ label: 'HP', value: '10' });
  });

  it('SAN を現在/最大リソースとして取り込む（空の現在値は最大値で補完）', () => {
    const result = parseCharasheetCharacter(coc)!;
    expect(result.statuses).toContainEqual({ label: '正気度', value: 99, max: 99 });
  });

  it('並列技能配列を接頭辞ごとのセクション（行＝インデックス）に展開する', () => {
    const result = parseCharasheetCharacter(coc)!;
    const battle = findSection(result.sections, '戦闘技能')!;
    expect(battle).toBeTruthy();
    // 1 行目は TBAD/TBAP に値があり、列名は CoC マップで変換される
    expect(battle.groups[0].fields).toContainEqual({ label: '初期値', value: 26, kind: 'number' });
    expect(battle.groups[0].fields).toContainEqual({ label: '合計', value: 26, kind: 'number' });
    // 全列が空の行（3,4 行目）はスキップされる
    expect(battle.groups.length).toBe(2);

    const know = findSection(result.sections, '知識技能')!;
    expect(know.groups.length).toBe(3);
  });

  it('能力値以外のスカラー（SAN_Max 等）はデータセクションに残る', () => {
    const result = parseCharasheetCharacter(coc)!;
    const data = findSection(result.sections, 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: 'TS_Total', value: 260, kind: 'number' });
    // NA1 など写像済みの能力値はデータセクションに重複して出ない
    expect(data.groups[0].fields.some((field) => field.label === 'NA1')).toBe(false);
  });

  it('非CoCシステムでもデータと配列は保持される（能力値写像は行わない）', () => {
    const other = { pc_name: 'X', game: 'arianrhod', skillName: ['剣', '盾'], NA1: 99 };
    const result = parseCharasheetCharacter(other)!;
    expect(result.params).toEqual([]);
    const data = findSection(result.sections, 'データ')!;
    expect(data.groups[0].fields).toContainEqual({ label: 'NA1', value: 99, kind: 'number' });
    expect(result.sections.some((section) => section.label === 'skillName')).toBe(true);
  });

  it('{family}_name を持つ配列ファミリを、行名＋日本語列名の節へ展開する（保管所共通フォーマット）', () => {
    const other = {
      pc_name: 'リーフ',
      game: 'somesystem',
      skill_name: ['ファイアボルト', '応急手当', ''],
      skill_timing: ['メジャー', 'マイナー', ''],
      skill_hantei: ['知力', '感覚', ''],
      skill_id: ['1', '2', ''],
      item_name: ['杖'],
      item_price: ['100'],
    };
    const result = parseCharasheetCharacter(other)!;
    const skill = findSection(result.sections, '技能')!;
    // 行ラベルは skill_name（番号ではない）、列は suffix を日本語化、空行と内部キー(id)は除外
    expect(skill.groups.map((group) => group.label)).toEqual(['ファイアボルト', '応急手当']);
    expect(skill.groups[0].fields).toContainEqual({ label: 'タイミング', value: 'メジャー', kind: 'text' });
    expect(skill.groups[0].fields).toContainEqual({ label: '判定', value: '知力', kind: 'text' });
    expect(skill.groups[0].fields.some((field) => field.label === 'id' || field.label === 'skill_id')).toBe(false);
    expect(findSection(result.sections, '所持品')!.groups[0].label).toBe('杖');
  });
});
