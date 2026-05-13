/**
 * GameDataElementComponent から切り出した純粋関数群。
 * テンプレートの値整形・URL 判定など、入出力だけで決まる処理を集約する。
 */

/** & < > " ' をエスケープして HTML 文字列に安全に埋め込めるようにする。 */
export function escapeHtml(text: string | number): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** http:// または https:// で始まる文字列を URL と見なす。 */
export function isUrlText(text: string | number): boolean {
  if (typeof text !== 'string') return false;
  return text.startsWith('https://') || text.startsWith('http://');
}
