import { fbm, makeValueNoise } from '@axe/domain/tabletop/field/field-noise';

describe('makeValueNoise()', () => {
  it('gives the same landscape for the same seed, and another for another', () => {
    const first = makeValueNoise(7);
    const again = makeValueNoise(7);
    const other = makeValueNoise(8);

    expect(first.at(3.25, 4.5)).toBe(again.at(3.25, 4.5));
    expect(first.at(3.25, 4.5)).not.toBe(other.at(3.25, 4.5));
  });

  it('stays between nothing and everything', () => {
    const noise = makeValueNoise(1);

    for (let i = 0; i < 400; i++) {
      const value = noise.at(i * 0.37, i * 0.11);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('eases between the lattice rather than jumping', () => {
    const noise = makeValueNoise(3);
    let biggestStep = 0;

    for (let i = 0; i < 200; i++) {
      const step = Math.abs(noise.at(i * 0.02, 0) - noise.at((i + 1) * 0.02, 0));
      biggestStep = Math.max(biggestStep, step);
    }

    expect(biggestStep).toBeLessThan(0.1);
  });
});

describe('fbm()', () => {
  it('keeps within range however many octaves it is given', () => {
    const noise = makeValueNoise(5);

    for (let i = 0; i < 200; i++) {
      const value = fbm(noise, i * 0.3, i * 0.2, 4);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('adds detail the smooth octave has not got', () => {
    const noise = makeValueNoise(5);
    const rough = (octaves: number) => {
      let total = 0;
      for (let i = 0; i < 800; i++) {
        total += Math.abs(fbm(noise, i * 0.005, 0, octaves) - fbm(noise, (i + 1) * 0.005, 0, octaves));
      }
      return total;
    };

    expect(rough(4)).toBeGreaterThan(rough(1));
  });
});
