import { matchesSearchText, normalizeSearchText, splitSearchTerms } from '@axe/core/util/text-search';

describe('normalizeSearchText()', () => {
  it('brings full-width letters down to half-width', () => {
    expect(normalizeSearchText('ＡＢＣ')).toBe('abc');
  });

  it('pays no attention to case', () => {
    expect(normalizeSearchText('GoBLin')).toBe('goblin');
  });

  it('drops the spaces at either end', () => {
    expect(normalizeSearchText('  ゴブリン  ')).toBe('ゴブリン');
  });
});

describe('splitSearchTerms()', () => {
  it('finds nothing in an empty search', () => {
    expect(splitSearchTerms('   ')).toEqual([]);
  });

  it('takes one word as one term', () => {
    expect(splitSearchTerms('ゴブリン')).toEqual(['ゴブリン']);
  });

  it('takes words apart at a space', () => {
    expect(splitSearchTerms('ゴブリン 戦士')).toEqual(['ゴブリン', '戦士']);
  });

  it('takes them apart at a full-width space too', () => {
    expect(splitSearchTerms('ゴブリン　戦士')).toEqual(['ゴブリン', '戦士']);
  });

  it('folds width before splitting, so a full-width query finds half-width text', () => {
    expect(splitSearchTerms('ＨＰ　ＭＰ')).toEqual(['hp', 'mp']);
  });
});

describe('matchesSearchText()', () => {
  it('lets everything through for an empty search', () => {
    expect(matchesSearchText('ゴブリン', [])).toBe(true);
  });

  it('finds text by part of it', () => {
    expect(matchesSearchText('ゴブリン戦士', ['ブリン'])).toBe(true);
  });

  it('wants every word of the search, not just one', () => {
    expect(matchesSearchText('ゴブリン戦士', ['ゴブリン', '戦士'])).toBe(true);
    expect(matchesSearchText('ゴブリン戦士', ['ゴブリン', '魔術師'])).toBe(false);
  });
});
