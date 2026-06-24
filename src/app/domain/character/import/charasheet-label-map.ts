/**
 * キャラクター保管所の「描画済みページ」から、フォーム入力名 → 表示ラベルの対応表を作る。
 *
 * 保管所のページは能力値や各種値を `<input name="S1" value="4">` のように持ち、
 * その列見出し（`<th>筋力</th>`）や行見出しがラベルになっている。位置依存キー（S1/NB1…）を
 * 人間可読なラベルへ写すための権威情報がページ自身にあるので、システム別の対応表は要らない。
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

/** 同じ列インデックスを持つ上方の `<th>` を列見出しとして探す（列指向テーブル）。 */
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

/** 同じ行内の先行する `<th>` を行見出しとして探す（行指向テーブル）。 */
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
 * 描画済みページ HTML から `{入力名: ラベル}` を作る。列見出し優先、無ければ行見出し。
 * ラベルが取れない入力は対象外（呼び出し側で元キーをそのまま使う）。
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
