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

function contrast(style: Record<string, string>): number {
  const text = luminance(rgbOf(style['color']));
  const bubble = luminance(rgbOf(style['background-color']));
  const [hi, lo] = text > bubble ? [text, bubble] : [bubble, text];
  return (hi + 0.05) / (lo + 0.05);
}

function hue([r, g, b]: [number, number, number]): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return h * 360;
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

  it('leaves the chosen colour alone where it can already be read', () => {
    expect(rgbOf(pipe.transform('#000000')!['color'])).toEqual(rgbOf('#000000'));
    expect(rgbOf(pipe.transform('#ff0000', 'dark')!['color'])).toEqual(rgbOf('#ff0000'));
    expect(rgbOf(pipe.transform('#006633')!['color'])).toEqual(rgbOf('#006633'));
  });

  it('holds every colour to the reading standard, on either theme', () => {
    for (const color of ['#9900ff', '#006633', '#0000ff', '#ff0000', '#ffcc00', '#66ccff', '#000000', '#ffffff']) {
      for (const theme of ['light', 'dark'] as const) {
        expect(contrast(pipe.transform(color, theme)!)).toBeGreaterThanOrEqual(4.4);
      }
    }
  });

  it('lifts a dark colour off a dark bubble rather than leaving it unreadable', () => {
    const style = pipe.transform('#006633', 'dark')!;

    // The bubble cannot help here: lightening it carries it towards the text, not away.
    expect(luminance(rgbOf(style['background-color']))).toBeLessThan(0.05);
    expect(luminance(rgbOf(style['color']))).toBeGreaterThan(luminance(rgbOf('#006633')));
  });

  it('keeps the hue that says who is speaking when it moves the lightness', () => {
    for (const color of ['#9900ff', '#006633', '#0000ff']) {
      const moved = rgbOf(pipe.transform(color, 'dark')!['color']);

      expect(hue(moved)).toBeCloseTo(hue(rgbOf(color)), 0);
    }
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
