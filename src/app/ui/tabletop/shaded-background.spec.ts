import { shadedBackgroundImage } from '@axe/ui/tabletop/shaded-background';

describe('shadedBackgroundImage', () => {
  it('lays nothing over a texture that is already as bright as it gets', () => {
    expect(shadedBackgroundImage('a.png', 1)).toBe('url(a.png)');
  });

  it('lays black over it at what the brightness takes away', () => {
    expect(shadedBackgroundImage('a.png', 0.3)).toBe(
      'linear-gradient(rgba(0,0,0,0.700), rgba(0,0,0,0.700)), url(a.png)'
    );
  });

  it('rounds to a thousandth, so the same shade reads as the same string', () => {
    expect(shadedBackgroundImage('a.png', 0.123456)).toBe(shadedBackgroundImage('a.png', 0.1234561));
  });

  it('leaves a texture alone when the difference is too small to see', () => {
    expect(shadedBackgroundImage('a.png', 0.9999)).toBe('url(a.png)');
  });
});
