/**
 * キャラクターシート倉庫（character-sheets.appspot.com）の編集フォーム（edit.html）から、
 * JSON のパス → 表示ラベルの対応表を作る。
 *
 * 倉庫のフォームは値要素の `id` に JSON パスを埋め込み（例 `id="ability.brave.dice"`）、
 * 見出し `<th class="... title ...">武勇</th>` を文書順で直前に置く。パス接頭辞（ability.brave）を
 * 人間可読なラベル（武勇）へ写すための権威情報がフォーム自身にあるので、システム別の対応表は要らない。
 */

function normalize(text: string | null): string {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[：:]\s*$/, '')
    .trim();
}

/** 文書順で 1 つ前の要素（前兄弟の最深部、無ければ親）。 */
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
 * 文書順で直前にある見出し `<th>` のラベルを返す。
 * `class="title"`（能力名等の見出し）があれば最優先、無ければ最寄りの `<th>`（行見出し）。
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
 * 編集フォーム HTML から `{JSONパス接頭辞: ラベル}` を作る。
 * `id="section.key.sub"` の最初の 2 階層（section.key）をパスとし、直前の見出しをラベルにする。
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
