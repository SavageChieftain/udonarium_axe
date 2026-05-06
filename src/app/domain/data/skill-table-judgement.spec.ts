import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
} from '@axe/domain/data/data-element';
import { findJudgementCandidates } from '@axe/domain/data/skill-table-judgement';

/** テスト用チェックセルを生成するヘルパー */
function makeCheckCell(name: string, checked: boolean, label = ''): DataElement {
  const cell = DataElement.create(name, checked ? 1 : 0, {
    [DataElementAttribute.ROLE]: DataElementRole.FIELD,
    [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.CHECK,
    [DataElementAttribute.CELL_TEXT]: label,
  });
  return cell;
}

/** テスト用行を生成するヘルパー */
function makeRow(name: string, cells: DataElement[]): DataElement {
  const row = DataElement.create(name, '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
  for (const cell of cells) row.appendChild(cell);
  return row;
}

const isChecked = (cell: DataElement): boolean => {
  const v = String(cell.value).trim().toLowerCase();
  return v === '1' || v === 'true';
};

/**
 * テスト用テーブル構造:
 *   列: A, B, C （3列）
 *   行: 行0, 行1, 行2, 行3 （4行）
 *   習得済み([x]): (0,0) (1,2) (3,1)
 */
function buildTestTable(): { rows: DataElement[]; columns: { name: string; label: string }[] } {
  const columns = [
    { name: 'A', label: 'A技能' },
    { name: 'B', label: 'B技能' },
    { name: 'C', label: 'C技能' },
  ];

  const row0 = makeRow('行0', [
    makeCheckCell('A', true, 'A技能名'),
    makeCheckCell('B', false, 'B技能名'),
    makeCheckCell('C', false, 'C技能名'),
  ]);
  const row1 = makeRow('行1', [
    makeCheckCell('A', false, 'A技能名'),
    makeCheckCell('B', false, 'B技能名'),
    makeCheckCell('C', true, 'C技能名'),
  ]);
  const row2 = makeRow('行2', [
    makeCheckCell('A', false, 'A技能名'),
    makeCheckCell('B', false, 'B技能名'),
    makeCheckCell('C', false, 'C技能名'),
  ]);
  const row3 = makeRow('行3', [
    makeCheckCell('A', false, 'A技能名'),
    makeCheckCell('B', true, 'B技能名'),
    makeCheckCell('C', false, 'C技能名'),
  ]);

  return { rows: [row0, row1, row2, row3], columns };
}

describe('findJudgementCandidates', () => {
  it('クリック位置からManhattan距離の近い順に習得済み技能を返す', () => {
    const { rows, columns } = buildTestTable();

    // クリック: (1, 0) → 距離: (0,0)=1, (1,2)=2, (3,1)=3
    const result = findJudgementCandidates(rows, columns, 1, 0, isChecked);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ rowName: '行0', colName: 'A', distance: 1 });
    expect(result[1]).toMatchObject({ rowName: '行1', colName: 'C', distance: 2 });
    expect(result[2]).toMatchObject({ rowName: '行3', colName: 'B', distance: 3 });
  });

  it('クリックセル自身が習得済みの場合は距離0で先頭に返す', () => {
    const { rows, columns } = buildTestTable();

    const result = findJudgementCandidates(rows, columns, 0, 0, isChecked);

    expect(result[0]).toMatchObject({ rowName: '行0', colName: 'A', distance: 0 });
  });

  it('習得済みがない場合は空配列を返す', () => {
    const columns = [{ name: 'A', label: 'A' }];
    const row = makeRow('行0', [makeCheckCell('A', false)]);

    const result = findJudgementCandidates([row], columns, 0, 0, isChecked);

    expect(result).toHaveLength(0);
  });

  it('maxCandidates件数を超えないよう切り詰める（デフォルト5件）', () => {
    const columns = Array.from({ length: 6 }, (_, i) => ({ name: `C${i}`, label: `C${i}` }));
    const cells = columns.map((col) => makeCheckCell(col.name, true));
    const row = makeRow('行0', cells);

    const result = findJudgementCandidates([row], columns, 0, 0, isChecked);

    expect(result).toHaveLength(5);
  });

  it('maxCandidatesを指定した件数に変更できる', () => {
    const { rows, columns } = buildTestTable();

    const result = findJudgementCandidates(rows, columns, 0, 0, isChecked, 2);

    expect(result).toHaveLength(2);
  });

  it('cellLabelにCELL_TEXT属性値が含まれる', () => {
    const { rows, columns } = buildTestTable();

    const result = findJudgementCandidates(rows, columns, 0, 0, isChecked);

    expect(result[0].cellLabel).toBe('A技能名');
  });

  it('CELL_TEXT未設定のセルはcellLabelが空文字', () => {
    const columns = [{ name: 'A', label: 'A技能' }];
    const row = makeRow('行0', [makeCheckCell('A', true)]);

    const result = findJudgementCandidates([row], columns, 0, 0, isChecked);

    expect(result[0].cellLabel).toBe('');
  });

  it('行をまたぐ距離も正しく計算する', () => {
    const { rows, columns } = buildTestTable();

    // クリック: (0, 2) → (0,0):距離2, (1,2):距離1, (3,1):距離4
    const result = findJudgementCandidates(rows, columns, 0, 2, isChecked);

    expect(result[0]).toMatchObject({ rowName: '行1', colName: 'C', distance: 1 });
    expect(result[1]).toMatchObject({ rowName: '行0', colName: 'A', distance: 2 });
    expect(result[2]).toMatchObject({ rowName: '行3', colName: 'B', distance: 4 });
  });

  describe('GAP距離オプション', () => {
    it('アクティブGAPを通る場合、gapCostsBetweenColsが追加される', () => {
      const { rows, columns } = buildTestTable();
      // 列0→1間にGAPコスト2（A→B間）
      const gapCostsBetweenCols = [2, 0];

      // クリック: (3, 0) → B(3,1)への基本距離=1、GAP=2 → 合計3
      const result = findJudgementCandidates(rows, columns, 3, 0, isChecked, 5, { gapCostsBetweenCols });

      const bCandidate = result.find((c) => c.colName === 'B' && c.rowName === '行3');
      expect(bCandidate?.distance).toBe(3); // 基本1 + gap2
    });

    it('非アクティブGAP（コスト0）は距離に影響しない', () => {
      const { rows, columns } = buildTestTable();
      const gapCostsBetweenCols = [0, 0];

      const result = findJudgementCandidates(rows, columns, 3, 0, isChecked, 5, { gapCostsBetweenCols });

      const bCandidate = result.find((c) => c.colName === 'B' && c.rowName === '行3');
      expect(bCandidate?.distance).toBe(1);
    });
  });

  describe('ループオプション', () => {
    it('loopVerticalが真の場合、縦方向の最短距離を使う', () => {
      const { rows, columns } = buildTestTable();
      // 行0と行3: 通常距離3、ループ距離4-3=1
      const result = findJudgementCandidates(rows, columns, 0, 1, isChecked, 5, { loopVertical: true });

      const bCandidate = result.find((c) => c.colName === 'B' && c.rowName === '行3');
      expect(bCandidate?.distance).toBe(1); // ループで距離1（縦3→0方向）
    });

    it('loopHorizontalが真の場合、横方向の最短距離を使う', () => {
      // 5列テーブル: A(0) B(1) C(2) D(3) E(4), 習得済み: A(0) E(4)
      const columns = Array.from({ length: 5 }, (_, i) => ({ name: String.fromCharCode(65 + i), label: `技${i}` }));
      const row = makeRow('行0', [
        makeCheckCell('A', true),
        makeCheckCell('B', false),
        makeCheckCell('C', false),
        makeCheckCell('D', false),
        makeCheckCell('E', true),
      ]);

      // クリック: (0,2=C) → A:距離2、E:距離2（ループで）
      const result = findJudgementCandidates([row], columns, 0, 2, isChecked, 5, { loopHorizontal: true });
      const aCandidate = result.find((c) => c.colName === 'A');
      const eCandidate = result.find((c) => c.colName === 'E');
      expect(aCandidate?.distance).toBe(2);
      expect(eCandidate?.distance).toBe(2);
    });

    it('loopHorizontalで逆方向の方が近い場合はそちらを使う', () => {
      // 6列: A B C D E F, 習得済み: A(0), クリック: F(5)
      // 通常距離5, ループ距離1（F→A折り返し）
      const columns = Array.from({ length: 6 }, (_, i) => ({ name: String.fromCharCode(65 + i), label: `技${i}` }));
      const row = makeRow('行0', [
        makeCheckCell('A', true),
        ...Array.from({ length: 5 }, (_, i) => makeCheckCell(String.fromCharCode(66 + i), false)),
      ]);

      const result = findJudgementCandidates([row], columns, 0, 5, isChecked, 5, { loopHorizontal: true });
      expect(result[0]).toMatchObject({ colName: 'A', distance: 1 });
    });
  });
});
