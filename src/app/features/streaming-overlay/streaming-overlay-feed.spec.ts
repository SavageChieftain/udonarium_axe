import { buildOverlayFeed, type OverlaySource } from '@axe/features/streaming-overlay/streaming-overlay-feed';

const NOW = 100_000;

function source(overrides: Partial<OverlaySource> = {}): OverlaySource {
  return {
    identifier: 'm1',
    name: 'アリス',
    text: 'こんばんは',
    timestamp: NOW,
    order: NOW,
    color: '#ffffff',
    isDice: false,
    isDirect: false,
    isSecret: false,
    isDisplayable: true,
    ...overrides,
  };
}

describe('buildOverlayFeed()', () => {
  it('新しいものを指定の件数だけ残すこと', () => {
    const sources = Array.from({ length: 10 }, (_, index) => source({ identifier: `m${index}`, text: `発言${index}` }));

    const feed = buildOverlayFeed(sources, NOW, { limit: 3, maxAgeMs: 0 });

    expect(feed.map((line) => line.text)).toEqual(['発言7', '発言8', '発言9']);
  });

  it('古いものを落とすこと', () => {
    const feed = buildOverlayFeed(
      [source({ identifier: 'old', timestamp: NOW - 200_000 }), source({ identifier: 'new' })],
      NOW,
      { limit: 6, maxAgeMs: 120_000 }
    );

    expect(feed.map((line) => line.identifier)).toEqual(['new']);
  });

  it('密談を出さないこと', () => {
    const feed = buildOverlayFeed([source({ isDirect: true }), source({ identifier: 'open' })], NOW);

    expect(feed.map((line) => line.identifier)).toEqual(['open']);
  });

  it('伏せたダイスを配信に流さないこと', () => {
    const feed = buildOverlayFeed([source({ isSecret: true, isDice: true }), source({ identifier: 'open' })], NOW);

    expect(feed.map((line) => line.identifier)).toEqual(['open']);
  });

  it('表に出ない発言を出さないこと', () => {
    const feed = buildOverlayFeed([source({ isDisplayable: false })], NOW);

    expect(feed).toEqual([]);
  });

  it('中身の無い行を出さないこと', () => {
    const feed = buildOverlayFeed([source({ text: '   ' })], NOW);

    expect(feed).toEqual([]);
  });

  it('ダイスの結果を見分けられるようにすること', () => {
    const feed = buildOverlayFeed([source({ isDice: true, text: '2D6 → 8' })], NOW);

    expect(feed[0]).toMatchObject({ isDice: true, text: '2D6 → 8' });
  });

  it('件数の指定が無ければ何も出さないこと', () => {
    expect(buildOverlayFeed([source()], NOW, { limit: 0, maxAgeMs: 0 })).toEqual([]);
  });
});
