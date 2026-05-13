/**
 * モバイルブラウザ等で WebAudio をユーザー操作の前に再生開始できない制約への対策。
 * 最初のタッチ/クリックを 1 回だけ拾って callback を呼び、自動で解除する。
 * domain 層が document を触らずに済むよう、ここに DOM 操作を閉じ込める。
 */
export function onFirstUserInteraction(callback: () => void): () => void {
  const handler = () => {
    document.body.removeEventListener('touchstart', handler, true);
    document.body.removeEventListener('mousedown', handler, true);
    callback();
  };
  document.body.addEventListener('touchstart', handler, true);
  document.body.addEventListener('mousedown', handler, true);
  return () => {
    document.body.removeEventListener('touchstart', handler, true);
    document.body.removeEventListener('mousedown', handler, true);
  };
}
