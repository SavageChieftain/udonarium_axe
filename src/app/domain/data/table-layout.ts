import { DataElement, DataElementAttribute, DataElementRole } from '@axe/domain/data/data-element';

export interface TableColumn {
  name: string;
  label: string;
  group: string;
  kind: string;
}

export interface TableColumnHeaderGroup {
  key: string;
  label: string;
  span: number;
}

export function getRawTableRows(element: DataElement): DataElement[] {
  return element.children.filter((child) => child.children.length > 0);
}

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

export function isTableControlRow(row: DataElement): boolean {
  const hasGapCell = row.children.some((child) => child.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap');
  if (!hasGapCell) return false;
  return row.children.every((child) => {
    if (child.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap') return true;
    return String(child.value ?? '').trim() === '' && child.getAttribute(DataElementAttribute.CELL_TEXT).trim() === '';
  });
}

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

export function getTableCell(row: DataElement, columnName: string): DataElement | null {
  return row.children.find((child) => child.fieldRole === DataElementRole.FIELD && child.name === columnName) ?? null;
}

export function isGapColumn(column: TableColumn): boolean {
  return column.kind === 'gap';
}

export function isCheckCellChecked(cell: DataElement): boolean {
  const value = String(cell.value).trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'x' || value === 'checked';
}

export function nextCheckCellValue(cell: DataElement, event?: Event): 0 | 1 {
  if (event?.target instanceof HTMLInputElement) return event.target.checked ? 1 : 0;
  return isCheckCellChecked(cell) ? 0 : 1;
}

export function getCellLabel(cell: DataElement): string {
  return cell.getAttribute(DataElementAttribute.CELL_TEXT).trim();
}

export function getCellUnit(cell: DataElement): string {
  const unit = cell.getAttribute(DataElementAttribute.UNIT).trim();
  return unit ? ` ${unit}` : '';
}

export function parseSelectChoices(choices: string): string[] {
  return choices
    .split(/\r?\n|,/)
    .map((choice) => choice.trim())
    .filter((choice) => choice.length > 0);
}

export function getSelectOptions(cell: DataElement): string[] {
  return parseSelectChoices(cell.getAttribute(DataElementAttribute.CHOICES));
}

export function isSelectValueListed(cell: DataElement): boolean {
  return getSelectOptions(cell).includes(String(cell.value ?? ''));
}

export function findGapCellInColumn(element: DataElement, column: TableColumn): DataElement | null {
  if (!isGapColumn(column)) return null;
  for (const row of getRawTableRows(element)) {
    const cell = getTableCell(row, column.name);
    if (cell?.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap') return cell;
  }
  return null;
}
