import { readableOn } from '@axe/domain/replay/replay-text-color';

const DARK: [number, number, number] = [0.03, 0.04, 0.055];

describe('readableOn()', () => {
  it('もともと読める色はそのまま使うこと', () => {
    expect(readableOn('#88ccff', DARK, '#ffffff')).toBe('#88ccff');
  });

  it('暗すぎる色は読める明るさまで持ち上げること', () => {
    const lifted = readableOn('#000080', DARK, '#ffffff');
    expect(lifted).not.toBe('#000080');
    expect(lifted).not.toBe('#ffffff');
  });

  it('真っ黒でも読める明るさの無彩色にすること', () => {
    const lifted = readableOn('#000000', DARK, '#ffffff');
    expect(lifted).not.toBe('#000000');
    expect(lifted).toMatch(/^#([0-9a-f]{2})\1\1$/);
  });

  it('色として読めない指定は既定に倒すこと', () => {
    expect(readableOn('', DARK, '#ffffff')).toBe('#ffffff');
    expect(readableOn('あか', DARK, '#ffffff')).toBe('#ffffff');
    expect(readableOn('#12345', DARK, '#ffffff')).toBe('#ffffff');
  });

  it('3 桁の指定も読むこと', () => {
    expect(readableOn('#8cf', DARK, '#ffffff')).toBe('#88ccff');
  });

  it('明るい下地では暗い側へ寄せること', () => {
    const onLight = readableOn('#ffff00', [1, 1, 1], '#000000');
    expect(onLight).not.toBe('#ffff00');
  });
});
