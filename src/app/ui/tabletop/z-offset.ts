/**
 * テーブル上に置く 3D オブジェクトの z 軸オフセット（Z-fighting 回避用の僅かな浮き）。
 * 数値はテーブル平面に対する重なり順を決め、大きいほど手前に描画される。
 * 値そのものが意味を持つので命名は「対象オブジェクト」に紐づけている。
 */

/** マスク（テーブルを覆う遮蔽板）。最も薄い浮き。 */
export const Z_OFFSET_MASK_PX = 0.1;

/** カード・カードスタック・テキストノート・地形（rotate 内）。マスクの上、ダイス/キャラの下。 */
export const Z_OFFSET_TABLETOP_OBJECT_PX = 0.15;

/** 射程範囲（レンジエリア）。tabletop object より僅かに前面に出して縁取りを見せる。 */
export const Z_OFFSET_RANGE_PX = 0.25;

/** ダイス・キャラクター。背の高い立体物として 1px 持ち上げる。 */
export const Z_OFFSET_TALL_OBJECT_PX = 1.0;

/** translateZ() CSS 文字列に整形するヘルパ。`transformCssOffset` オプション用。 */
export function translateZCss(zOffsetPx: number): string {
  return `translateZ(${zOffsetPx}px)`;
}
