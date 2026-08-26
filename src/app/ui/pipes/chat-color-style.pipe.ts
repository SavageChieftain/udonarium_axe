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
/** Only a whisper of the speaker's hue: more of it costs the contrast the text needs. */
const TINT = 0.12;
/** Below this the bubble gives up the side the theme asks for and goes to the other one. */
const FLIP_RATIO = 2;
/** As light as a dark bubble ever gets, so that light text keeps its edge. */
const DARK_CEILING_L = 0.4;
/**
 * What a dark bubble holds to. On a dark page it is the norm and can stand well clear of the
 * text; on a light one it is the odd one out, and is kept off black at the cost of some of that.
 */
const DARK_BUBBLE_RATIO_ON_DARK = 4.5;
const DARK_BUBBLE_RATIO_ON_LIGHT = 4.5;

/** What text has to hold against the bubble it sits on: the reading standard for body text. */
const TEXT_TARGET_RATIO = 4.5;
/** How finely the search walks the lightness, which is well below what an eye can tell apart. */
const TEXT_STEP = 0.005;

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

/** The lightest dark bubble the colour still holds against, between the two ends it may take. */
function darkBubbleL(h: number, tint: number, textLum: number, target: number): number {
  const ratioAt = (l: number) => contrastRatio(textLum, luminance(...quantize(hslToRgb(h, tint, l))));
  if (ratioAt(DARK_CEILING_L) >= target) return DARK_CEILING_L;
  if (ratioAt(DARK_BUBBLE_L) < target) return DARK_BUBBLE_L;

  let lo = DARK_BUBBLE_L;
  let hi = DARK_CEILING_L;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ratioAt(mid) >= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The nearest lightness to the one chosen that can be read on this bubble.
 *
 * The bubble is settled first and moved as far as it can go; a dark colour on a dark page
 * still lands under three to one, because lifting that bubble carries it towards the text
 * rather than away. What is left is the text, so it steps away from the bubble - lighter on
 * a dark one, darker on a light one - keeping the hue and the saturation that say who is
 * speaking, and stopping at the first lightness that can be read.
 */
function readableTextL(h: number, s: number, l: number, bubbleLum: number): number {
  const ratioAt = (candidate: number) => contrastRatio(luminance(...quantize(hslToRgb(h, s, candidate))), bubbleLum);
  if (ratioAt(l) >= TEXT_TARGET_RATIO) return l;

  for (let step = TEXT_STEP; step <= 1; step += TEXT_STEP) {
    const up = l + step;
    if (up <= 1 && ratioAt(up) >= TEXT_TARGET_RATIO) return up;
    const down = l - step;
    if (down >= 0 && ratioAt(down) >= TEXT_TARGET_RATIO) return down;
  }
  return ratioAt(1) >= ratioAt(0) ? 1 : 0;
}

@Pipe({ name: 'chatColorStyle', pure: true })
export class ChatColorStylePipe implements PipeTransform {
  transform(color: string | null | undefined, theme: 'light' | 'dark' = 'light'): Record<string, string> | null {
    if (!color) return null;

    const rgb = parseHex(color);
    if (!rgb) return null;

    const [h, s, l] = rgbToHsl(...rgb);
    const textLum = luminance(...rgb);
    const tint = Math.min(s, 1) * TINT;

    // The bubble takes the side the theme is on, and gives it up only for a colour that cannot be
    // read there at all. The dark side then comes back up as far as the colour allows, so that it
    // sits on a slate rather than on black. Only then is the text itself moved, and only as far
    // as it must be to be read.
    const lightRatio = contrastRatio(textLum, luminance(...quantize(hslToRgb(h, tint, LIGHT_BUBBLE_L))));
    const darkestRatio = contrastRatio(textLum, luminance(...quantize(hslToRgb(h, tint, DARK_BUBBLE_L))));
    const wantsLight = theme !== 'dark';
    const [onTheme, onOther] = wantsLight ? [lightRatio, darkestRatio] : [darkestRatio, lightRatio];
    const keepsTheme = onTheme >= FLIP_RATIO || onTheme >= onOther;
    const light = wantsLight === keepsTheme;

    const darkTarget = wantsLight ? DARK_BUBBLE_RATIO_ON_LIGHT : DARK_BUBBLE_RATIO_ON_DARK;
    const bubbleL = light ? LIGHT_BUBBLE_L : darkBubbleL(h, tint, textLum, darkTarget);
    const bubble = toCss(hslToRgb(h, tint, bubbleL));
    const border = toCss(hslToRgb(h, tint, light ? bubbleL - 0.18 : bubbleL + 0.2));
    const bubbleLum = luminance(...quantize(hslToRgb(h, tint, bubbleL)));
    const text = toCss(hslToRgb(h, s, readableTextL(h, s, l, bubbleLum)));

    return {
      color: text,
      'background-color': bubble,
      '--bubble-bg': bubble,
      '--ui-bubble-caret-border': border,
    };
  }
}
