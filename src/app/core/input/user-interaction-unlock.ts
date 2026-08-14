/**
 * For browsers that refuse to start audio before the user has touched anything.
 * It catches the first touch or click, calls back once and unhooks itself.
 * The dom work is kept here so the domain never touches the document.
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
