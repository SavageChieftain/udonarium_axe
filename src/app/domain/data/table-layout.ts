import { DataElement, DataElementAttribute, DataElementRole } from '@axe/domain/data/data-element';

/** テーブル表示の 1 カラム分のメタ。group はカラムヘッダのグルーピング表示用。 */
export interface TableColumn {
  name: string;
  label: string;
  group: string;
  kind: string;
}

/** カラムヘッダ上段の「グループ」セル。連続する同一ラベルを span でまとめる。 */
export interface TableColumnHeaderGroup {
  key: string;
  label: string;
  span: number;
}

/** element が「行を子に持つ」テーブル形ノード前提で、空でない行だけを取り出す。 */
export function getRawTableRows(element: DataElement): DataElement[] {
  return element.children.filter((child) => child.children.length > 0);
}

/** element がテーブル表示に必要な構造（2 段の DataElement, 葉が FIELD）を満たすかを判定する。 */
export function canRenderAsTable(element: DataElement): boolean {
  if (element.children.length < 1) return false;
  for (const row of element.children) {
    if (row.fieldRole === DataElementRole.FIELD || row.children.length < 1) return false;
    for (const child of row.children) {
      if (child.fieldRole !== DataElementRole.FIELD) return false;
    }
  }
  return true;
}

/** 「全 cell が空 + gap セルを含む」行は表示用 body から除外する control 行とみなす。 */
export function isTableControlRow(row: DataElement): boolean {
  const hasGapCell = row.children.some((child) => child.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap');
  if (!hasGapCell) return false;
  return row.children.every((child) => {
    if (child.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap') return true;
    return String(child.value ?? '').trim() === '' && child.getAttribute(DataElementAttribute.CELL_TEXT).trim() === '';
  });
}

/** 描画対象の body 行（control 行を除外したもの）を返す。 */
export function getTableBodyRows(element: DataElement): DataElement[] {
  return getRawTableRows(element).filter((row) => !isTableControlRow(row));
}

function createTableColumn(cell: DataElement): TableColumn {
  return {
    name: cell.name,
    label: cell.getAttribute(DataElementAttribute.COLUMN_LABEL).trim() || cell.name,
    group: cell.getAttribute(DataElementAttribute.COLUMN_GROUP).trim(),
    kind: cell.getAttribute(DataElementAttribute.CELL_KIND).trim(),
  };
}

/** 全行を走査して登場順にカラム集合を抽出する（カラム名重複は最初のみ採用）。 */
export function getTableColumns(element: DataElement): TableColumn[] {
  const columns: TableColumn[] = [];
  for (const row of getRawTableRows(element)) {
    for (const child of row.children) {
      if (child.fieldRole !== DataElementRole.FIELD || columns.some((column) => column.name === child.name)) continue;
      columns.push(createTableColumn(child));
    }
  }
  return columns;
}

/** カラム配列から、ヘッダ上段のグループラベル（連続する同一 group/label を span でまとめる）を作る。 */
export function buildTableColumnHeaderGroups(columns: readonly TableColumn[]): TableColumnHeaderGroup[] {
  const groups: TableColumnHeaderGroup[] = [];
  for (const [index, column] of columns.entries()) {
    const label = column.group || column.label;
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.span += 1;
    } else {
      groups.push({ key: `${index}:${label}`, label, span: 1 });
    }
  }
  return groups;
}

/** 行から指定カラム名の FIELD cell を取り出す。なければ null。 */
export function getTableCell(row: DataElement, columnName: string): DataElement | null {
  return row.children.find((child) => child.fieldRole === DataElementRole.FIELD && child.name === columnName) ?? null;
}

/** カラム種別が 'gap'（行頭の余白チェックカラム）かどうか。 */
export function isGapColumn(column: TableColumn): boolean {
  return column.kind === 'gap';
}

/** チェックセルの value を真偽として解釈する（"1" / "true" / "x" / "checked" を ON とみなす）。 */
export function isCheckCellChecked(cell: DataElement): boolean {
  const value = String(cell.value).trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'x' || value === 'checked';
}

/** セルのチェック状態を反転した次の数値 (0/1) を返す。`event` 由来の checkbox なら明示値を採用。 */
export function nextCheckCellValue(cell: DataElement, event?: Event): 0 | 1 {
  if (event?.target instanceof HTMLInputElement) return event.target.checked ? 1 : 0;
  return isCheckCellChecked(cell) ? 0 : 1;
}

/** チェック・ラベルカラム等の表示用テキスト（属性 CELL_TEXT）。 */
export function getCellLabel(cell: DataElement): string {
  return cell.getAttribute(DataElementAttribute.CELL_TEXT).trim();
}

/** リソース表示で値の右に付く単位（属性 UNIT。空ならスペース無し）。 */
export function getCellUnit(cell: DataElement): string {
  const unit = cell.getAttribute(DataElementAttribute.UNIT).trim();
  return unit ? ` ${unit}` : '';
}

/** 改行またはカンマ区切りの選択肢文字列を、空要素を除いた配列にする。 */
export function parseSelectChoices(choices: string): string[] {
  return choices
    .split(/\r?\n|,/)
    .map((choice) => choice.trim())
    .filter((choice) => choice.length > 0);
}

/** Select 型セルの選択肢配列。属性 CHOICES を `parseSelectChoices` で解釈する。 */
export function getSelectOptions(cell: DataElement): string[] {
  return parseSelectChoices(cell.getAttribute(DataElementAttribute.CHOICES));
}

/** 現在値が選択肢に含まれているか。含まれていないときは「自由入力」表示の判定に使う。 */
export function isSelectValueListed(cell: DataElement): boolean {
  return getSelectOptions(cell).includes(String(cell.value ?? ''));
}

/** gap カラム配下で、行を走査して最初に見つかった `kind === 'gap'` の cell を返す。 */
export function findGapCellInColumn(element: DataElement, column: TableColumn): DataElement | null {
  if (!isGapColumn(column)) return null;
  for (const row of getRawTableRows(element)) {
    const cell = getTableCell(row, column.name);
    if (cell?.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap') return cell;
  }
  return null;
}
