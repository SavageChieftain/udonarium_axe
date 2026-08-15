import { readableOn } from '@axe/domain/replay/replay-text-color';

const DARK: [number, number, number] = [0.03, 0.04, 0.055];

describe('readableOn()', () => {
  it('leaves a colour that already reads alone', () => {
    expect(readableOn('#88ccff', DARK, '#ffffff')).toBe('#88ccff');
  });

  it('lifts one too dark until it reads', () => {
    const lifted = readableOn('#000080', DARK, '#ffffff');
    expect(lifted).not.toBe('#000080');
    expect(lifted).not.toBe('#ffffff');
  });

  it('lifts even black to a readable grey', () => {
    const lifted = readableOn('#000000', DARK, '#ffffff');
    expect(lifted).not.toBe('#000000');
    expect(lifted).toMatch(/^#([0-9a-f]{2})\1\1$/);
  });

  it('falls back to the default for anything it cannot read as a colour', () => {
    expect(readableOn('', DARK, '#ffffff')).toBe('#ffffff');
    expect(readableOn('あか', DARK, '#ffffff')).toBe('#ffffff');
    expect(readableOn('#12345', DARK, '#ffffff')).toBe('#ffffff');
  });

  it('reads a three-digit colour too', () => {
    expect(readableOn('#8cf', DARK, '#ffffff')).toBe('#88ccff');
  });

  it('moves towards the dark on a light ground', () => {
    const onLight = readableOn('#ffff00', [1, 1, 1], '#000000');
    expect(onLight).not.toBe('#ffff00');
  });
});
