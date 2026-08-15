/**
 * Builds a map from the paths in the json to the labels shown, out of the editing form
 * of the sheet warehouse.
 *
 * The form carries the path in the identifier of each value and puts a heading just before
 * it in the document. The form itself is therefore the authority on which path means which
 * label, and no table per system is needed.
 */

function normalize(text: string | null): string {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[：:]\s*$/, '')
    .trim();
}

/** The element before this one in the document: the deepest part of the previous sibling, or the parent. */
function previousInDocumentOrder(node: Element): Element | null {
  const sibling = node.previousElementSibling;
  if (sibling) {
    let cursor = sibling;
    while (cursor.lastElementChild) cursor = cursor.lastElementChild;
    return cursor;
  }
  return node.parentElement;
}

function isLabelText(text: string): boolean {
  return text !== '' && /[一-龠ぁ-んァ-ヶ]/.test(text) && text.length <= 6;
}

/**
 * Returns the label of the heading just before it in the document.
 * A titled heading wins; otherwise the nearest heading, which is the row label.
 */
function nearestTitleLabel(element: Element): string {
  const table = element.closest('table');
  let fallback = '';
  let cursor: Element | null = element;
  for (let steps = 0; steps < 800 && cursor; steps++) {
    cursor = previousInDocumentOrder(cursor);
    if (!cursor || (table && !table.contains(cursor))) break;
    if (cursor.tagName !== 'TH') continue;
    const label = normalize(cursor.textContent);
    if (!isLabelText(label)) continue;
    if (/\btitle\b/.test(cursor.getAttribute('class') ?? '')) return label;
    if (fallback === '') fallback = label;
  }
  return fallback;
}

/**
 * Builds the map from the path prefixes to the labels out of the form.
 * The first two levels of each identifier are the path, and the heading before it is the label.
 */
export function buildAppspotLabelMap(html: string): Record<string, string> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const map: Record<string, string> = {};
  for (const element of Array.from(doc.querySelectorAll('[id]'))) {
    const id = element.getAttribute('id') ?? '';
    const match = /^([a-zA-Z]+\.[a-zA-Z0-9]+)/.exec(id);
    if (!match || map[match[1]] !== undefined) continue;
    const label = nearestTitleLabel(element);
    if (label !== '') map[match[1]] = label;
  }
  return map;
}
