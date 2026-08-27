import { carriedImagesOf } from '@axe/domain/media/carried-images';

describe('carriedImagesOf()', () => {
  it('reads the names off anything that offers them', () => {
    expect(carriedImagesOf({ carriedImageIdentifiers: ['a', 'b'] })).toEqual(['a', 'b']);
  });

  it('reads none off anything that does not', () => {
    expect(carriedImagesOf({})).toEqual([]);
    expect(carriedImagesOf(null)).toEqual([]);
    expect(carriedImagesOf(undefined)).toEqual([]);
    expect(carriedImagesOf('a string')).toEqual([]);
  });

  it('keeps only the names that are names', () => {
    expect(carriedImagesOf({ carriedImageIdentifiers: ['a', '', 3, null, 'b'] })).toEqual(['a', 'b']);
  });
});
