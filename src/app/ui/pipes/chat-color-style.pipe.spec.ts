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

  it('gives white text a bubble dark enough to read against, and no darker', () => {
    const bubble = luminance(rgbOf(pipe.transform('#ffffff')!['background-color']));

    expect(bubble).toBeGreaterThan(0.05);
    expect(bubble).toBeLessThan(0.25);
  });

  it('gives a dark colour a light bubble and a light colour a dark one', () => {
    expect(luminance(rgbOf(pipe.transform('#0000cc')!['background-color']))).toBeGreaterThan(0.85);
    expect(luminance(rgbOf(pipe.transform('#ffff66')!['background-color']))).toBeLessThan(0.25);
  });

  it('never lands a colour on a black slab, whatever it is', () => {
    for (const colour of ['#ffffff', '#cccccc', '#ffff00', '#FF0000', '#0099FF', '#00CC00', '#888888']) {
      const bubble = luminance(rgbOf(pipe.transform(colour)!['background-color']));

      expect(bubble).toBeGreaterThan(0.03);
    }
  });

  it('carries only a whisper of the hue, so the bubble stays out of the text way', () => {
    const [r, g, b] = rgbOf(pipe.transform('#ff0000')!['background-color']);

    expect(r).toBeGreaterThan(g);
    expect(r - b).toBeLessThan(0.2);
  });

  it('keeps every colour on the palette readable on the bubble it is given, in either theme', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const colour of [
        '#000000',
        '#FF0000',
        '#0099FF',
        '#00CC00',
        '#ffffff',
        '#006600',
        '#888888',
        '#ffff00',
        '#800080',
      ]) {
        const style = pipe.transform(colour, theme)!;
        const [hi, lo] = [luminance(rgbOf(colour)), luminance(rgbOf(style['background-color']))].sort((a, b) => b - a);

        expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('stands well clear of the text on a dark page, where the bubble is the norm', () => {
    for (const colour of ['#FF0000', '#0099FF', '#00CC00', '#888888', '#cccccc', '#ffffff']) {
      const style = pipe.transform(colour, 'dark')!;
      const [hi, lo] = [luminance(rgbOf(colour)), luminance(rgbOf(style['background-color']))].sort((a, b) => b - a);

      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('holds a dark bubble further from the text on a dark page than on a light one', () => {
    for (const colour of ['#FF0000', '#0099FF', '#00CC00']) {
      const text = luminance(rgbOf(colour));
      const distanceOn = (theme: 'light' | 'dark') => {
        const bubble = luminance(rgbOf(pipe.transform(colour, theme)!['background-color']));
        const [hi, lo] = [text, bubble].sort((a, b) => b - a);
        return (hi + 0.05) / (lo + 0.05);
      };

      expect(distanceOn('dark')).toBeGreaterThan(distanceOn('light'));
    }
  });

  it('takes the side the theme is on', () => {
    expect(luminance(rgbOf(pipe.transform('#FF0000', 'light')!['background-color']))).toBeGreaterThan(0.85);
    expect(luminance(rgbOf(pipe.transform('#FF0000', 'dark')!['background-color']))).toBeLessThan(0.1);
  });

  it('gives that side up for a colour that cannot be read on it', () => {
    expect(luminance(rgbOf(pipe.transform('#ffffff', 'light')!['background-color']))).toBeLessThan(0.25);
    expect(luminance(rgbOf(pipe.transform('#000000', 'dark')!['background-color']))).toBeGreaterThan(0.85);
  });

  it('holds the reading minimum wherever a light bubble carries the colour', () => {
    for (const colour of ['#000000', '#006600', '#800080', '#006633']) {
      const style = pipe.transform(colour)!;
      const [hi, lo] = [luminance(rgbOf(colour)), luminance(rgbOf(style['background-color']))].sort((a, b) => b - a);

      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('carries a system colour as far as any other, rather than to the dimmest grey that would pass', () => {
    const style = pipe.transform('#006633')!;

    expect(luminance(rgbOf(style['background-color']))).toBeGreaterThan(0.85);
  });

  it('gives the caret the same colour as the bubble it points out of', () => {
    const style = pipe.transform('#ff0000')!;

    expect(style['--bubble-bg']).toBe(style['background-color']);
    expect(style['--ui-bubble-caret-border']).not.toBe(style['background-color']);
  });
});
