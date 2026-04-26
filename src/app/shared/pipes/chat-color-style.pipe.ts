import { Pipe, PipeTransform } from '@angular/core';

/**
 * WCAG 2.x 相対輝度を計算する。
 * @returns 0 (黒) 〜 1 (白)、パース失敗時は null
 */
function relativeLuminance(hex: string): number | null {
  const clean = hex.replace(/^#/, '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * チャットカラー用スタイルオブジェクトを生成するパイプ。
 *
 * ユーザーが設定した色（color）はそのまま尊重しつつ、
 * 色の輝度に応じた text-shadow を付与することで、
 * ダーク／ライト両テーマで見やすさを確保する。
 *
 * - 明るい色（輝度 > 0.18）: 暗いハローを追加 → ライト背景でも読める
 * - 暗い色（輝度 ≤ 0.18）: 明るいハローを追加 → ダーク背景でも読める
 */
@Pipe({ name: 'chatColorStyle', pure: true })
export class ChatColorStylePipe implements PipeTransform {
  transform(color: string | null | undefined): { color: string; 'text-shadow': string } | null {
    if (!color) return null;

    const lum = relativeLuminance(color);
    if (lum === null) return { color, 'text-shadow': 'none' };

    // 明るい色 → 暗いハローで、ライト背景での視認性を補助
    // 暗い色  → 明るいハローで、ダーク背景での視認性を補助
    const shadow =
      lum > 0.18
        ? '0 0 4px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.4)'
        : '0 0 5px rgba(255,255,255,0.65), 0 0 3px rgba(255,255,255,0.5)';

    return { color, 'text-shadow': shadow };
  }
}
