import { Pipe, PipeTransform } from '@angular/core';
import {
  contrastRatio,
  lchToRgb,
  parseHexColor,
  relativeLuminance,
  rgbToCss,
  rgbToLch,
} from '@axe/core/util/tonal-color';

/**
 * The tone the bubble sits at, and the band the text is kept in above or below it.
 *
 * Material's tonal palettes are the way out of a bind that has no other: a colour cannot be
 * both left exactly as it is and made readable, because a mid lightness is unreadable on
 * every light background there is. So the hue and the chroma - what actually says who is
 * speaking - are kept, and only the tone is moved, into a band that clears the bubble.
 */
const BUBBLE_TONE = { light: 92, dark: 26 };
const TEXT_BAND = { light: { from: 8, to: 38 }, dark: { from: 82, to: 98 } };

/** As much colour as a bubble carries. A container is a surface, not a highlighter. */
const BUBBLE_CHROMA = 14;

/** How far the border round the bubble stands off it, in tone. */
const BORDER_TONE_STEP = { light: -14, dark: 16 };

function bandFor(theme: 'light' | 'dark') {
  return theme === 'dark' ? TEXT_BAND.dark : TEXT_BAND.light;
}

/**
 * Where a colour of this lightness sits inside the band the theme leaves for text.
 *
 * Pinning every colour to one tone would make a dark green and a bright one the same
 * message; keeping their order inside the band is what keeps two speakers apart.
 */
function textTone(tone: number, theme: 'light' | 'dark'): number {
  const band = bandFor(theme);
  const place = Math.min(100, Math.max(0, tone)) / 100;
  return band.from + (band.to - band.from) * place;
}

@Pipe({ name: 'chatColorStyle', pure: true })
export class ChatColorStylePipe implements PipeTransform {
  transform(color: string | null | undefined, theme: 'light' | 'dark' = 'light'): Record<string, string> | null {
    if (!color) return null;

    const rgb = parseHexColor(color);
    if (!rgb) return null;

    const { tone, chroma, hue } = rgbToLch(rgb);
    const bubbleTone = theme === 'dark' ? BUBBLE_TONE.dark : BUBBLE_TONE.light;

    const text = lchToRgb({ tone: textTone(tone, theme), chroma, hue });
    const bubble = lchToRgb({ tone: bubbleTone, chroma: Math.min(chroma, BUBBLE_CHROMA), hue });
    const border = lchToRgb({
      tone: bubbleTone + (theme === 'dark' ? BORDER_TONE_STEP.dark : BORDER_TONE_STEP.light),
      chroma: Math.min(chroma, BUBBLE_CHROMA),
      hue,
    });

    const bubbleCss = rgbToCss(bubble);
    return {
      color: rgbToCss(text),
      'background-color': bubbleCss,
      '--bubble-bg': bubbleCss,
      '--ui-bubble-caret-border': rgbToCss(border),
    };
  }
}

/** How well a colour will read once it has been carried into the band its theme leaves. */
export function chatBubbleContrast(color: string, theme: 'light' | 'dark'): number {
  const rgb = parseHexColor(color);
  if (!rgb) return 0;
  const { tone, chroma, hue } = rgbToLch(rgb);
  const bubbleTone = theme === 'dark' ? BUBBLE_TONE.dark : BUBBLE_TONE.light;
  return contrastRatio(
    relativeLuminance(lchToRgb({ tone: textTone(tone, theme), chroma, hue })),
    relativeLuminance(lchToRgb({ tone: bubbleTone, chroma: Math.min(chroma, BUBBLE_CHROMA), hue }))
  );
}
