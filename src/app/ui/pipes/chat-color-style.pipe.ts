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

/**
 * Where the bubble starts: the background every other panel on the page already has.
 *
 * `--ui-elevated`, as a lightness. A bubble is furniture - it belongs to the page rather
 * than to whoever is speaking - so it stands where the rest of the furniture stands until
 * the colour on it cannot be read there.
 */
const BASE_L = { light: 0.898, dark: 0.153 };

/** Only a whisper of the speaker's hue: more of it costs the contrast the text needs. */
const TINT = 0.12;

/**
 * What text has to hold against the bubble it sits on: the reading standard for body text.
 *
 * Asking more than the standard was tried and taken back. It buys a near-black speaker a
 * lighter bubble, but only by pushing off the ordinary panel background every colour that
 * was comfortably readable where it stood: a bright blue reaches 5.06 there and no more, so
 * a stricter figure sends it to the darkest end of the page instead.
 */
const TARGET_RATIO = 4.5;

/**
 * How far the bubble may go in either direction: as dark as the page's own darkest, and
 * as light as its own lightest. Some colours cannot be read on anything within that, and
 * for those a bubble of pure black or pure white would be a worse answer than the best one.
 */
const DARKEST_L = 0.07;
const LIGHTEST_L = 0.97;

/**
 * How far the bubble will go for a colour before it gives up and stays where it is.
 *
 * Past about half the range the cure is worse than the complaint: a pale card in a dark
 * room, or a dark slab in a lit one, and the reader who chose that colour did not ask for
 * either. Such a colour keeps the background every other panel has, and the setting panel
 * shows it as it will be so that the choice is made with open eyes.
 */
const MAX_DRIFT = 0.5;

/** How finely the search walks away from the base, which is below what an eye can tell apart. */
const STEP = 0.005;

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
 * The bubble nearest the page's own background that the chosen colour can be read on.
 *
 * The colour is the reader's and is never touched, so everything the standard asks for has
 * to come out of the bubble. It leaves the background it shares with every other panel only
 * as far as it must, and in whichever direction is nearer: a sheet of white in a dark room
 * and a black slab in a lit one are the same mistake, a bubble that went further than it had
 * to. Some colours - a mid grey, a pure red - cannot reach the standard from either side; for
 * those the search ends at whichever end of the range reads best.
 */
function bubbleLightness(h: number, tint: number, textLum: number, baseL: number): number {
  const ratioAt = (l: number) => contrastRatio(textLum, luminance(...quantize(hslToRgb(h, tint, l))));
  if (ratioAt(baseL) >= TARGET_RATIO) return baseL;

  for (let away = STEP; away <= MAX_DRIFT; away += STEP) {
    const up = baseL + away;
    const down = baseL - away;
    const upReads = up <= LIGHTEST_L && ratioAt(up) >= TARGET_RATIO;
    const downReads = down >= DARKEST_L && ratioAt(down) >= TARGET_RATIO;
    if (upReads && downReads) return ratioAt(up) >= ratioAt(down) ? up : down;
    if (upReads) return up;
    if (downReads) return down;
  }
  return baseL;
}

/** How well a colour will read on the bubble it is going to be given. */
export function chatBubbleContrast(color: string, theme: 'light' | 'dark'): number {
  const rgb = parseHex(color);
  if (!rgb) return 0;
  const [h, s] = rgbToHsl(...rgb);
  const tint = Math.min(s, 1) * TINT;
  const l = bubbleLightness(h, tint, luminance(...rgb), theme === 'dark' ? BASE_L.dark : BASE_L.light);
  return contrastRatio(luminance(...rgb), luminance(...quantize(hslToRgb(h, tint, l))));
}

@Pipe({ name: 'chatColorStyle', pure: true })
export class ChatColorStylePipe implements PipeTransform {
  transform(color: string | null | undefined, theme: 'light' | 'dark' = 'light'): Record<string, string> | null {
    if (!color) return null;

    const rgb = parseHex(color);
    if (!rgb) return null;

    const [h, s] = rgbToHsl(...rgb);
    const tint = Math.min(s, 1) * TINT;
    const l = bubbleLightness(h, tint, luminance(...rgb), theme === 'dark' ? BASE_L.dark : BASE_L.light);

    const bubble = toCss(hslToRgb(h, tint, l));
    const border = toCss(hslToRgb(h, tint, l > 0.5 ? l - 0.18 : l + 0.2));

    return {
      color,
      'background-color': bubble,
      '--bubble-bg': bubble,
      '--ui-bubble-caret-border': border,
    };
  }
}
