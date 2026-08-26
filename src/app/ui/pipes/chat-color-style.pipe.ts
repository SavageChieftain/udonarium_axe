import { Pipe, PipeTransform } from '@angular/core';

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace(/^#/, '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
}

function luminance(r: number, g: number, b: number): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue2rgb(h + 1 / 3), hue2rgb(h), hue2rgb(h - 1 / 3)];
}

/** How light a bubble under dark text gets, and how dark one under light text is ever allowed to go. */
const LIGHT_BUBBLE_L = 0.97;
const DARK_BUBBLE_L = 0.09;
/**
 * Where a dark bubble settles when the colour on it cannot be read at any darkness.
 *
 * A mid grey is beyond help from either side; going darker still buys it almost nothing and
 * leaves a hole in the page where the message should be, so it sits on a slate instead.
 */
const DARK_SLATE_L = 0.2;
/** As dark as a light bubble is allowed to get, before it stops reading as the light side at all. */
const LIGHT_FLOOR_L = 0.55;
/**
 * Below this there is not enough colour in it to glare against a sheet of paper.
 *
 * A sheet of white behind coloured text is a lamp in the face, which is why a coloured
 * bubble comes down to where it is merely readable. Black and the greys have no such
 * quarrel with paper, and read better on it than on the least they would put up with.
 */
const GREY_SATURATION = 0.15;
/** Only a whisper of the speaker's hue: more of it costs the contrast the text needs. */
const TINT = 0.12;
/** As light as a dark bubble ever gets, so that light text keeps its edge. */
const DARK_CEILING_L = 0.4;

/** What text has to hold against the bubble it sits on: the reading standard for body text. */
const TARGET_RATIO = 4.5;
/**
 * How much better the far side has to be before the bubble crosses over to it.
 *
 * Some colours cannot reach the standard anywhere - a pure red tops out just short of it on
 * white - and putting those on a black slab in a lit room costs more than the little it buys.
 * The bubble only changes sides when the other side both reads properly and reads markedly
 * better, which is what tells a colour that is merely short of the mark from one that is lost.
 */
const FLIP_GAIN = 1.3;

function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** The colour as it will actually be written out, so the contrast is measured on what is shown. */
function quantize([r, g, b]: [number, number, number]): [number, number, number] {
  const toByte = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255) / 255;
  return [toByte(r), toByte(g), toByte(b)];
}

function toCss(rgb: [number, number, number]): string {
  const [r, g, b] = quantize(rgb).map((c) => Math.round(c * 255));
  return `rgb(${r},${g},${b})`;
}

/**
 * The best dark bubble the colour can be read on, and how well it reads there.
 *
 * Contrast does not climb steadily as the bubble lightens: for a dark colour, lifting the
 * bubble carries it towards the text before it ever gets clear of it, so both ends are
 * tried and the lightest one that can be read is taken.
 */
/**
 * The least light bubble the colour can be read on, and how well it reads there.
 *
 * A bubble only has to be light enough, and a sheet of white in a dark room is a lamp in
 * the face. Coming down to where the colour stops being readable leaves a card on the
 * table instead.
 */
function bestLightBubble(h: number, s: number, tint: number, textLum: number): { l: number; ratio: number } {
  const ratioAt = (l: number) => contrastRatio(textLum, luminance(...quantize(hslToRgb(h, tint, l))));
  const atCeiling = ratioAt(LIGHT_BUBBLE_L);
  if (s < GREY_SATURATION) return { l: LIGHT_BUBBLE_L, ratio: atCeiling };
  if (atCeiling < TARGET_RATIO || ratioAt(LIGHT_FLOOR_L) >= TARGET_RATIO) {
    const l = atCeiling < TARGET_RATIO ? LIGHT_BUBBLE_L : LIGHT_FLOOR_L;
    return { l, ratio: ratioAt(l) };
  }

  let lo = LIGHT_FLOOR_L;
  let hi = LIGHT_BUBBLE_L;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ratioAt(mid) >= TARGET_RATIO) hi = mid;
    else lo = mid;
  }
  return { l: hi, ratio: ratioAt(hi) };
}

function bestDarkBubble(h: number, tint: number, textLum: number): { l: number; ratio: number } {
  const ratioAt = (l: number) => contrastRatio(textLum, luminance(...quantize(hslToRgb(h, tint, l))));
  const atCeiling = ratioAt(DARK_CEILING_L);
  if (atCeiling >= TARGET_RATIO) return { l: DARK_CEILING_L, ratio: atCeiling };

  const atDarkest = ratioAt(DARK_BUBBLE_L);
  if (atDarkest < TARGET_RATIO) {
    return atDarkest >= atCeiling
      ? { l: DARK_SLATE_L, ratio: ratioAt(DARK_SLATE_L) }
      : { l: DARK_CEILING_L, ratio: atCeiling };
  }

  let lo = DARK_BUBBLE_L;
  let hi = DARK_CEILING_L;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ratioAt(mid) >= TARGET_RATIO) lo = mid;
    else hi = mid;
  }
  return { l: lo, ratio: ratioAt(lo) };
}

@Pipe({ name: 'chatColorStyle', pure: true })
export class ChatColorStylePipe implements PipeTransform {
  transform(color: string | null | undefined, theme: 'light' | 'dark' = 'light'): Record<string, string> | null {
    if (!color) return null;

    const rgb = parseHex(color);
    if (!rgb) return null;

    const [h, s] = rgbToHsl(...rgb);
    const textLum = luminance(...rgb);
    const tint = Math.min(s, 1) * TINT;

    // The colour the reader chose is the text, verbatim, whatever it costs the bubble. The bubble
    // takes the side the theme is on while the colour can be read there, and goes over to the
    // other side when it cannot; the dark side comes up off black as far as the colour allows.
    const lightSide = bestLightBubble(h, s, tint, textLum);
    const dark = bestDarkBubble(h, tint, textLum);
    const wantsLight = theme !== 'dark';
    const [onTheme, onOther] = wantsLight ? [lightSide.ratio, dark.ratio] : [dark.ratio, lightSide.ratio];
    const crosses = onTheme < TARGET_RATIO && onOther >= TARGET_RATIO && onOther >= onTheme * FLIP_GAIN;
    const light = wantsLight !== crosses;

    const bubbleL = light ? lightSide.l : dark.l;
    const bubble = toCss(hslToRgb(h, tint, bubbleL));
    const border = toCss(hslToRgb(h, tint, light ? bubbleL - 0.18 : bubbleL + 0.2));

    return {
      color,
      'background-color': bubble,
      '--bubble-bg': bubble,
      '--ui-bubble-caret-border': border,
    };
  }
}
