/**
 * Builds a map from the input names to the labels shown, out of the rendered page of the sheet archive.
 *
 * The page holds each value in a named input, and its column or row heading is the label.
 * The page itself is therefore the authority on which positional key means which label,
 * and no table per system is needed.
 */

function colspanOf(cell: Element): number {
  const value = Number.parseInt(cell.getAttribute('colspan') ?? '1', 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function columnIndexOf(cell: Element): number {
  let index = 0;
  let sibling = cell.previousElementSibling;
  while (sibling) {
    index += colspanOf(sibling);
    sibling = sibling.previousElementSibling;
  }
  return index;
}

function normalize(text: string | null): string {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[：:]\s*$/, '')
    .trim();
}

/** Looks up the column for a heading at the same index, for a table laid out in columns. */
function columnHeaderLabel(field: Element): string {
  const cell = field.closest('td, th');
  const row = cell?.closest('tr');
  if (!cell || !row) return '';
  const target = columnIndexOf(cell);
  let header = row.previousElementSibling;
  while (header) {
    let cursor = 0;
    for (const candidate of Array.from(header.children)) {
      const span = colspanOf(candidate);
      if (target >= cursor && target < cursor + span) {
        if (candidate.tagName === 'TH') {
          const label = normalize(candidate.textContent);
          if (label !== '' && label.length <= 8) return label;
        }
        break;
      }
      cursor += span;
    }
    header = header.previousElementSibling;
  }
  return '';
}

/** Looks back along the row for one, for a table laid out in rows. */
function rowHeaderLabel(field: Element): string {
  const cell = field.closest('td');
  let sibling = cell?.previousElementSibling ?? null;
  while (sibling) {
    if (sibling.tagName === 'TH') {
      const label = normalize(sibling.textContent);
      if (label !== '' && label.length <= 10) return label;
    }
    sibling = sibling.previousElementSibling;
  }
  return '';
}

/**
 * Builds the map from the input names to the labels out of the rendered page. A column heading wins, and a row heading fills in.
 * An input with no label is left out, and the caller keeps its own key.
 */
export function buildCharasheetLabelMap(html: string): Record<string, string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const map: Record<string, string> = {};
  for (const field of Array.from(doc.querySelectorAll('input[name], select[name], textarea[name]'))) {
    const name = field.getAttribute('name') ?? '';
    if (name === '' || name.endsWith('[]') || map[name] !== undefined) continue;
    const label = columnHeaderLabel(field) || rowHeaderLabel(field);
    if (label !== '') map[name] = label;
  }
  return map;
}
