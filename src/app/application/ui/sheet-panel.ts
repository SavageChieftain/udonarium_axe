/**
 * シートの窓の見出し。
 *
 * 名前の付いていない駒もあるので、あるときだけ添える。
 */
export function sheetPanelTitle(label: string, name: string): string {
  return name.length > 0 ? `${label} - ${name}` : label;
}

/**
 * シートの窓の置き場所。つまんだところを中心に開く。
 *
 * 端に寄せると、窓が指した物そのものを覆う。中心なら物は窓の下にあり、
 * 動かせば見える位置関係になる。
 */
export function sheetPanelBox(
  at: { x: number; y: number },
  width: number,
  height: number
): { left: number; top: number; width: number; height: number } {
  return { left: at.x - width / 2, top: at.y - height / 2, width, height };
}
