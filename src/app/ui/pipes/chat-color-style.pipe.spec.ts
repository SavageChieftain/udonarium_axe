import { ChatColorStylePipe } from '@axe/ui/pipes/chat-color-style.pipe';

function rgbOf(css: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(css);
  if (hex) {
    return [
      parseInt(hex[1].slice(0, 2), 16) / 255,
      parseInt(hex[1].slice(2, 4), 16) / 255,
      parseInt(hex[1].slice(4, 6), 16) / 255,
    ];
  }
  const match = /rgb\((\d+),(\d+),(\d+)\)/.exec(css);
  if (!match) throw new Error(`not a colour: ${css}`);
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

describe('ChatColorStylePipe', () => {
  let pipe: ChatColorStylePipe;

  beforeEach(() => {
    pipe = new ChatColorStylePipe();
  });

  it('leaves the bubble alone where there is no colour to work from', () => {
    expect(pipe.transform('')).toBeNull();
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform('not a colour')).toBeNull();
  });

  it('uses the chosen colour for the text, exactly as it was chosen', () => {
    expect(pipe.transform('#000000')?.['color']).toBe('#000000');
    expect(pipe.transform('#ff0000')?.['color']).toBe('#ff0000');
  });

  it('gives black text a white bubble rather than a grey one', () => {
    const style = pipe.transform('#000000')!;

    expect(luminance(rgbOf(style['background-color']))).toBeGreaterThan(0.85);
  });

  it('gives white text a near-black bubble', () => {
    const style = pipe.transform('#ffffff')!;

    expect(luminance(rgbOf(style['background-color']))).toBeLessThan(0.05);
  });

  it('gives a dark colour a light bubble and a light colour a dark one', () => {
    expect(luminance(rgbOf(pipe.transform('#0000cc')!['background-color']))).toBeGreaterThan(0.85);
    expect(luminance(rgbOf(pipe.transform('#ffff66')!['background-color']))).toBeLessThan(0.05);
  });

  it('carries only a whisper of the hue, so the bubble stays out of the text way', () => {
    const [r, g, b] = rgbOf(pipe.transform('#ff0000')!['background-color']);

    expect(r).toBeGreaterThan(g);
    expect(r - b).toBeLessThan(0.2);
  });

  it('keeps every colour on the palette readable on the bubble it is given', () => {
    for (const colour of ['#000000', '#FF0000', '#0099FF', '#ffffff', '#006600', '#888888', '#ffff00', '#800080']) {
      const style = pipe.transform(colour)!;
      const [hi, lo] = [luminance(rgbOf(colour)), luminance(rgbOf(style['background-color']))].sort((a, b) => b - a);

      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('leaves a system or dice message with the muted tint it has always had', () => {
    const system = pipe.transform('#006633', true)!;

    expect(system['color']).toBe('#006633');
    expect(system['background-color']).toBe('rgb(201,207,204)');
  });

  it('gives the caret the same colour as the bubble it points out of', () => {
    const style = pipe.transform('#ff0000')!;

    expect(style['--bubble-bg']).toBe(style['background-color']);
    expect(style['--ui-bubble-caret-border']).not.toBe(style['background-color']);
  });
});
