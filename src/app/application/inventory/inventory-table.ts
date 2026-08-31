import { findStatusAilment, StatusAilment } from '@axe/domain/character/status-ailment';
import { DataElement, DataElementFieldType, DataElementType } from '@axe/domain/data/data-element';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export type InventoryCellKind = 'numberResource' | 'check' | 'calc' | 'value' | 'ailment' | 'none';

export interface InventoryTableColumn {
  name: string;
  /** What the room registered under this name, where it registered one. */
  ailment: StatusAilment | null;
}

export interface InventoryTableCell {
  element: DataElement | null;
  kind: InventoryCellKind;
}

export interface InventoryTableRow {
  object: TabletopObject;
  cells: InventoryTableCell[];
}

export interface InventoryTable {
  columns: InventoryTableColumn[];
  rows: InventoryTableRow[];
}

function cellKind(element: DataElement | null): InventoryCellKind {
  if (!element) return 'none';
  if (element.fieldType === DataElementFieldType.CALC) return 'calc';
  if (element.type === DataElementType.NUMBER_RESOURCE) return 'numberResource';
  if (element.type === DataElementType.CHECK) return 'check';
  return 'value';
}

/**
 * Lays the display items out sideways: one column each, one row a piece.
 *
 * The line breaks the display items allow mean nothing here - a table has no line to break -
 * so they are dropped from the columns and from every row at the same place, which is what
 * keeps a cell under its own heading. A piece with no such item of its own gets an empty cell
 * rather than a shifted one.
 *
 * A name the room has registered as a state is a state column whatever the sheets hold, since
 * that is the name the reader put in the display items on purpose.
 */
export function buildInventoryTable(
  objects: readonly TabletopObject[],
  dataTags: readonly string[],
  ailments: readonly StatusAilment[],
  elementsOf: (object: TabletopObject) => readonly (DataElement | null)[],
  newLineString: string
): InventoryTable {
  const kept: number[] = [];
  const columns: InventoryTableColumn[] = [];
  dataTags.forEach((tag, at) => {
    if (tag === newLineString) return;
    kept.push(at);
    columns.push({ name: tag, ailment: findStatusAilment(ailments, tag) });
  });

  const rows = objects.map((object) => {
    const elements = elementsOf(object);
    const cells = kept.map((at, column) => {
      if (columns[column].ailment) return { element: null, kind: 'ailment' as const };
      const element = elements[at] ?? null;
      return { element, kind: cellKind(element) };
    });
    return { object, cells };
  });

  return { columns, rows };
}
