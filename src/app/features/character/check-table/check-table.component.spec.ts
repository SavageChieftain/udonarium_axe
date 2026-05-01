import { parseCheckTable, toggleCheckbox } from '@axe/features/character/check-table/check-table.component';

describe('parseCheckTable', () => {
  it('空文字列は空ブロック配列を返すこと', () => {
    const blocks = parseCheckTable('');
    expect(blocks).toEqual([{ kind: 'plain', tokens: [] }]);
  });

  it('テキストのみの行を plain ブロックとして返すこと', () => {
    const blocks = parseCheckTable('テーブル表');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe('plain');
    expect((blocks[0] as { tokens: { kind: string; text: string }[] }).tokens[0]).toEqual({
      kind: 'text',
      text: 'テーブル表',
    });
  });

  it('パイプ区切り行を table ブロックとして返すこと', () => {
    const blocks = parseCheckTable('|A|B|');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe('table');
  });

  it('チェックボックス [] をトークンとしてパースすること', () => {
    const blocks = parseCheckTable('[]テスト');
    const tokens = (blocks[0] as { tokens: { kind: string }[] }).tokens;
    expect(tokens[0].kind).toBe('check');
    expect((tokens[0] as { kind: string; checked: boolean }).checked).toBe(false);
  });

  it('チェック済み [x] をパースすること', () => {
    const blocks = parseCheckTable('[x]テスト');
    const tokens = (blocks[0] as { tokens: { kind: string }[] }).tokens;
    expect((tokens[0] as { kind: string; checked: boolean }).checked).toBe(true);
  });

  it('連続するチェックボックスに連番インデックスを付与すること', () => {
    const blocks = parseCheckTable('[][]');
    const tokens = (blocks[0] as { tokens: { kind: string; idx: number }[] }).tokens;
    expect(tokens[0].idx).toBe(0);
    expect(tokens[1].idx).toBe(1);
  });

  it('テーブル行をまたいでインデックスが連番になること', () => {
    const blocks = parseCheckTable('|[]A|[]B|\n[]C');
    const table = blocks[0] as { kind: string; rows: { cells: { kind: string; idx: number }[][] }[] };
    expect(table.rows[0].cells[0][0]).toMatchObject({ kind: 'check', idx: 0 });
    expect(table.rows[0].cells[1][0]).toMatchObject({ kind: 'check', idx: 1 });
    const plain = blocks[1] as { tokens: { kind: string; idx: number }[] };
    expect(plain.tokens[0]).toMatchObject({ kind: 'check', idx: 2 });
  });
});

describe('toggleCheckbox', () => {
  it('指定インデックスの [] を [x] に変換すること', () => {
    expect(toggleCheckbox('[][]', 0)).toBe('[x][]');
  });

  it('指定インデックスの [x] を [] に変換すること', () => {
    expect(toggleCheckbox('[x][]', 0)).toBe('[][]');
  });

  it('他のチェックボックスには影響しないこと', () => {
    expect(toggleCheckbox('[x][][x]', 1)).toBe('[x][x][x]');
  });

  it('全角 [ｘ] も [] に変換できること', () => {
    expect(toggleCheckbox('[ｘ]', 0)).toBe('[]');
  });
});
