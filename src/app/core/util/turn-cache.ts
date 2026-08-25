/**
 * Something worked out once and handed back for the rest of this turn of the event loop.
 *
 * A screen drawing a list asks the same question once per row, and the answer cannot change
 * while it is drawing, because nothing else runs until it is done. Holding the answer for
 * exactly that long is enough to make the list read the source once instead of once per row,
 * and short enough that nothing can go stale: the moment the turn ends, so does the answer.
 */
export function turnCache<T>(make: () => T): () => T {
  let held: { value: T } | null = null;
  return () => {
    if (!held) {
      held = { value: make() };
      queueMicrotask(() => (held = null));
    }
    return held.value;
  };
}
