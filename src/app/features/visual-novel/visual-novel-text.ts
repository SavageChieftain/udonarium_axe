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
