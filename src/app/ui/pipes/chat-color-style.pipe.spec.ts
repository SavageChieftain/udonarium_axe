import { ChatColorStylePipe } from '@axe/ui/pipes/chat-color-style.pipe';

/** The lightness of `--ui-elevated`: the background every other panel on the page has. */
const BASE_L = { light: 0.898, dark: 0.153 };

const PALETTE = [
  '#000000',
  '#333333',
  '#888888',
  '#cccccc',
  '#ffffff',
  '#ff0000',
  '#ffcc00',
  '#00cc00',
  '#006633',
  '#0099ff',
  '#0000ff',
  '#9900ff',
  '#800080',
];

const THEMES = ['light', 'dark'] as const;

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

function ratio(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function contrast(style: Record<string, string>): number {
  return ratio(luminance(rgbOf(style['color'])), luminance(rgbOf(style['background-color'])));
}

function lightnessOf([r, g, b]: [number, number, number]): number {
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

/** How far the bubble had to leave the background it shares with the rest of the page. */
function drift(style: Record<string, string>, theme: 'light' | 'dark'): number {
  return Math.abs(lightnessOf(rgbOf(style['background-color'])) - BASE_L[theme]);
}

/** The best any bubble could do for this colour, whatever it looked like. */
function bestPossible(colour: string): number {
  const text = luminance(rgbOf(colour));
  return Math.max(ratio(text, luminance([1, 1, 1])), ratio(text, luminance([0, 0, 0])));
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

  it('never changes the colour the reader chose, whatever it costs the bubble', () => {
    for (const colour of PALETTE) {
      for (const theme of THEMES) {
        expect(pipe.transform(colour, theme)?.['color']).toBe(colour);
      }
    }
  });

  it('holds the reading standard wherever the colour can reach it', () => {
    for (const colour of PALETTE) {
      for (const theme of THEMES) {
        if (bestPossible(colour) < 4.5) continue;
        expect(contrast(pipe.transform(colour, theme)!)).toBeGreaterThanOrEqual(4.4);
      }
    }
  });

  it('gets as near the standard as the colour allows when it cannot be reached at all', () => {
    // A pure red tops out at four to one on white and just over five on black.
    const style = pipe.transform('#ff0000', 'light')!;

    expect(bestPossible('#ff0000')).toBeGreaterThan(4.5);
    expect(contrast(style)).toBeGreaterThanOrEqual(4.4);
  });

  it('stays on the background the rest of the page has when the colour can be read there', () => {
    for (const colour of ['#0099ff', '#66ccff', '#ffcc00', '#00cc00', '#ffffff', '#cccccc']) {
      expect(drift(pipe.transform(colour, 'dark')!, 'dark')).toBeLessThan(0.01);
    }
  });

  it('leaves that background only as far as it must', () => {
    for (const colour of PALETTE) {
      for (const theme of THEMES) {
        const style = pipe.transform(colour, theme)!;
        const away = drift(style, theme);
        if (contrast(style) < 4.4 || away < 0.02) continue;

        // One step back towards the page's own background and the colour stops being readable.
        const shown = lightnessOf(rgbOf(style['background-color']));
        const back = shown > BASE_L[theme] ? shown - 0.02 : shown + 0.02;
        const grey: [number, number, number] = [back, back, back];

        expect(ratio(luminance(rgbOf(colour)), luminance(grey))).toBeLessThan(5.2);
      }
    }
  });

  it('carries only a whisper of the hue, so the bubble stays out of the text way', () => {
    const [r, g, b] = rgbOf(pipe.transform('#ff0000')!['background-color']);

    expect(r).toBeGreaterThan(g);
    expect(r - b).toBeLessThan(0.2);
  });

  it('gives the caret the same colour as the bubble it points out of', () => {
    const style = pipe.transform('#ff0000')!;

    expect(style['--bubble-bg']).toBe(style['background-color']);
    expect(style['--ui-bubble-caret-border']).not.toBe(style['background-color']);
  });
});
