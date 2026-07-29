export function elementsAt(x: number, y: number): HTMLElement[] {
  if (typeof document.elementsFromPoint !== 'function') {
    const single = document.elementFromPoint(x, y);
    return single instanceof HTMLElement ? [single] : [];
  }
  return document.elementsFromPoint(x, y).filter((element): element is HTMLElement => element instanceof HTMLElement);
}
