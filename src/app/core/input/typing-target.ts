/**
 * 打鍵の行き先が「文字入力」かどうか。
 *
 * 画面の操作キー（送り・切り替え・空白での掴み）は、文字を打っている最中には効かせない。
 * 判定を写し取ると、新しい入力欄を足したときに一部の画面だけキーを奪い続ける。
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}
