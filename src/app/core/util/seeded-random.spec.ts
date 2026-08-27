import { seededRandom } from '@axe/core/util/seeded-random';

describe('seededRandom()', () => {
  it('returns the same sequence from the same seed', () => {
    const first = seededRandom(99);
    const second = seededRandom(99);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('returns a different sequence from a different seed', () => {
    const first = seededRandom(99);
    const second = seededRandom(100);

    expect([first(), first(), first()]).not.toEqual([second(), second(), second()]);
  });

  it('returns something at or above nothing and below one', () => {
    const random = seededRandom(0);

    for (let count = 0; count < 50; count++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps the sequence it had before it moved here', () => {
    const random = seededRandom(99);

    expect([random(), random(), random(), random()]).toEqual([
      0.2604658124037087, 0.8048227655235678, 0.5408715349622071, 0.6902434257790446,
    ]);
  });

  it('treats a seed of nothing the same as one', () => {
    const zero = seededRandom(0);
    const one = seededRandom(1);

    expect([zero(), zero()]).toEqual([one(), one()]);
  });
});
