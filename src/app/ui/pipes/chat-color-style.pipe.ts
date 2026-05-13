import { Pipe, PipeTransform } from '@angular/core';

/** hex (#rgb or #rrggbb) → 正規化 RGB [0, 1] | null */
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

/** 正規化 RGB → WCAG 相対輝度 [0, 1] */
function luminance(r: number, g: number, b: number): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** 正規化 RGB → HSL (h: 0-360, s: 0-1, l: 0-1) */
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

/** HSL → 正規化 RGB */
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

const MIN_RATIO = 4.5;

/**
 * テキスト色に対して WCAG AA (4.5:1) を満たす背景色を生成する。
 * 背景色は元の色と同じ色相・低彩度（s*0.2）で、明度を二分探索で調整する。
 * テキストが暗ければ明るい背景、明るければ暗い背景を生成する。
 */
function contrastBackground(h: number, s: number, textLum: number): string {
  const bgS = s * 0.2; // 背景の彩度は抑えめに
  const lighten = textLum < 0.5; // 暗いテキスト → 明るい背景
  const targetLum = lighten ? MIN_RATIO * (textLum + 0.05) - 0.05 : (textLum + 0.05) / MIN_RATIO - 0.05;

  let lo = lighten ? 0.5 : 0;
  let hi = lighten ? 1 : 0.5;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const lum = luminance(...hslToRgb(h, bgS, mid));
    if (lighten ? lum < targetLum : lum > targetLum) {
      if (lighten) lo = mid;
      else hi = mid;
    } else {
      if (lighten) hi = mid;
      else lo = mid;
    }
  }
  const [r, g, b] = hslToRgb(h, bgS, (lo + hi) / 2);
  const toInt = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255);
  return `rgba(${toInt(r)},${toInt(g)},${toInt(b)},0.85)`;
}

/**
 * チャットカラー用スタイルオブジェクトを生成するパイプ。
 *
 * ユーザーが設定したテキスト色はそのまま保持し、
 * 発言ボディの背景色をテキスト色に対して WCAG AA (4.5:1) を満たす
 * 同系色（低彩度）に設定することで視認性を確保する。
 */
@Pipe({ name: 'chatColorStyle', pure: true })
export class ChatColorStylePipe implements PipeTransform {
  transform(color: string | null | undefined): Record<string, string> | null {
    if (!color) return null;

    const rgb = parseHex(color);
    if (!rgb) return null;

    const [r, g, b] = rgb;
    const [h, s] = rgbToHsl(r, g, b);
    const textLum = luminance(r, g, b);
    const bg = contrastBackground(h, s, textLum);

    return {
      color,
      'background-color': bg,
      '--bubble-bg': bg,
    };
  }
}
