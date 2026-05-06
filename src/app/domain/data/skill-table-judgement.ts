import { DataElement, DataElementAttribute, DataElementFieldType } from '@axe/domain/data/data-element';

export interface SkillJudgementCandidate {
  cell: DataElement;
  rowName: string;
  colName: string;
  colLabel: string;
  /** セルの CELL_TEXT 属性値（技能名）。未設定なら空文字 */
  cellLabel: string;
  distance: number;
}

export interface JudgementOptions {
  /**
   * 技能列 i と i+1 の間のGAPコスト配列（長さ = techColumns.length - 1）。
   * アクティブGAPを通るときに加算される追加距離。
   */
  gapCostsBetweenCols?: number[];
  /** 横方向（列）ループ */
  loopHorizontal?: boolean;
  /** 縦方向（行）ループ */
  loopVertical?: boolean;
}

/**
 * 技能表の判定候補算出。
 * クリックされたセル位置から Manhattan距離の近い順に
 * 習得済み（checked）技能を最大 maxCandidates 件返す。
 * GAP列コストとループ設定に対応。
 */
export function findJudgementCandidates(
  rows: DataElement[],
  columns: { name: string; label: string }[],
  targetRowIndex: number,
  targetColIndex: number,
  isChecked: (cell: DataElement) => boolean,
  maxCandidates = 5,
  options: JudgementOptions = {}
): SkillJudgementCandidate[] {
  const { gapCostsBetweenCols = [], loopHorizontal = false, loopVertical = false } = options;
  const candidates: SkillJudgementCandidate[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    for (let ci = 0; ci < columns.length; ci++) {
      const { name: colName, label: colLabel } = columns[ci];
      const cell = row.children.find(
        (child) => child.name === colName && child.fieldType === DataElementFieldType.CHECK
      );
      if (!cell || !isChecked(cell)) continue;

      const rowDist = calcRowDistance(ri, targetRowIndex, rows.length, loopVertical);
      const colDist = calcColDistance(ci, targetColIndex, columns.length, gapCostsBetweenCols, loopHorizontal);
      const distance = rowDist + colDist;
      const cellLabel = cell.getAttribute(DataElementAttribute.CELL_TEXT).trim();

      candidates.push({ cell, rowName: row.name, colName, colLabel, cellLabel, distance });
    }
  }

  return candidates.sort((a, b) => a.distance - b.distance).slice(0, maxCandidates);
}

function calcRowDistance(fromIdx: number, toIdx: number, rowCount: number, loop: boolean): number {
  const diff = Math.abs(fromIdx - toIdx);
  if (!loop || rowCount <= 1) return diff;
  return Math.min(diff, rowCount - diff);
}

function calcColDistance(
  fromIdx: number,
  toIdx: number,
  colCount: number,
  gapCostsBetweenCols: number[],
  loop: boolean
): number {
  const minIdx = Math.min(fromIdx, toIdx);
  const maxIdx = Math.max(fromIdx, toIdx);

  // 順方向距離（minIdx → maxIdx）
  let forwardDist = maxIdx - minIdx;
  for (let i = minIdx; i < maxIdx; i++) {
    forwardDist += gapCostsBetweenCols[i] ?? 0;
  }

  if (!loop || colCount <= 1) return forwardDist;

  // 逆方向距離（maxIdx → wrap → minIdx）
  let backwardDist = colCount - (maxIdx - minIdx);
  // minIdx 側のGAP（0 .. minIdx-1 の間）
  for (let i = 0; i < minIdx; i++) {
    backwardDist += gapCostsBetweenCols[i] ?? 0;
  }
  // maxIdx 側のGAP（maxIdx .. colCount-2 の間）
  for (let i = maxIdx; i < colCount - 1; i++) {
    backwardDist += gapCostsBetweenCols[i] ?? 0;
  }

  return Math.min(forwardDist, backwardDist);
}
