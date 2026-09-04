function createGraphemeSegmenter(): Intl.Segmenter | null {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return null;
  try {
    return new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  } catch {
    return null;
  }
}

const graphemeSegmenter = createGraphemeSegmenter();

export function toGraphemes(text: string): string[] {
  if (text.length < 1) return [];
  if (!graphemeSegmenter) return Array.from(text);
  return Array.from(graphemeSegmenter.segment(text), (segment) => segment.segment);
}

/**
 * Where each letter of a line ends, counted in the units a string is sliced by.
 *
 * A line is typed out one letter at a time, and cutting it by counting letters again on
 * every tick walks the whole line each time. The ends are worked out once, and each tick is
 * then one lookup and one cut.
 */
export function graphemeEnds(text: string): number[] {
  const ends: number[] = [];
  let at = 0;
  for (const grapheme of toGraphemes(text)) {
    at += grapheme.length;
    ends.push(at);
  }
  return ends;
}
