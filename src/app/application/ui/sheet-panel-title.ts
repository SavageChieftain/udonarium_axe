/**
 * シートの窓の見出し。
 *
 * 名前の付いていない駒もあるので、あるときだけ添える。
 */
export function sheetPanelTitle(label: string, name: string): string {
  return name.length > 0 ? `${label} - ${name}` : label;
}
