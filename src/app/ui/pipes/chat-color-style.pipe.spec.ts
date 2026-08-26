import { parseHexColor, relativeLuminance, rgbToLch } from '@axe/core/util/tonal-color';
import { chatBubbleContrast, ChatColorStylePipe } from '@axe/ui/pipes/chat-color-style.pipe';

const PALETTE = [
  '#000000',
  '#333333',
  '#888888',
  '#cccccc',
  '#ffffff',
  '#ff0000',
  '#990000',
  '#ffcc00',
  '#00cc00',
  '#006633',
  '#0099ff',
  '#66ccff',
  '#0000ff',
  '#9900ff',
  '#800080',
];

const THEMES = ['light', 'dark'] as const;

function rgbOf(css: string): [number, number, number] {
  const match = /rgb\((\d+),(\d+),(\d+)\)/.exec(css);
  if (!match) throw new Error(`not a colour: ${css}`);
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
}

function hueGap(a: number, b: number): number {
  const gap = Math.abs(a - b) % 360;
  return gap > 180 ? 360 - gap : gap;
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

  it('holds every colour to the reading standard, on either theme', () => {
    for (const colour of PALETTE) {
      for (const theme of THEMES) {
        expect(chatBubbleContrast(colour, theme)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps the hue that says who is speaking', () => {
    for (const colour of PALETTE) {
      const chosen = rgbToLch(parseHexColor(colour)!);
      if (chosen.chroma < 5) continue;

      for (const theme of THEMES) {
        const shown = rgbToLch(rgbOf(pipe.transform(colour, theme)!['color']));

        expect(hueGap(shown.hue, chosen.hue)).toBeLessThan(6);
      }
    }
  });

  it('keeps a colour out of the bubble it sits on, so a speaker is not a wash of one hue', () => {
    for (const colour of ['#ff0000', '#0099ff', '#9900ff']) {
      for (const theme of THEMES) {
        const bubble = rgbToLch(rgbOf(pipe.transform(colour, theme)!['background-color']));

        expect(bubble.chroma).toBeLessThanOrEqual(15);
      }
    }
  });

  it('stays in the register of the theme it is shown on', () => {
    for (const colour of PALETTE) {
      // Never a black slab in a lit room, and never a sheet of paper in a dark one.
      expect(relativeLuminance(rgbOf(pipe.transform(colour, 'light')!['background-color']))).toBeGreaterThan(0.55);
      expect(relativeLuminance(rgbOf(pipe.transform(colour, 'dark')!['background-color']))).toBeLessThan(0.1);
    }
  });

  it('keeps two colours of one hue apart, rather than flattening them to a single tone', () => {
    for (const theme of THEMES) {
      const dark = rgbToLch(rgbOf(pipe.transform('#006633', theme)!['color']));
      const bright = rgbToLch(rgbOf(pipe.transform('#00cc00', theme)!['color']));

      expect(bright.tone).toBeGreaterThan(dark.tone);
    }
  });

  it('gives the caret the same colour as the bubble it points out of', () => {
    const style = pipe.transform('#ff0000')!;

    expect(style['--bubble-bg']).toBe(style['background-color']);
    expect(style['--ui-bubble-caret-border']).not.toBe(style['background-color']);
  });
});
