/**
 * A texture darkened to the brightness asked for, without a filter.
 *
 * `brightness(k)` multiplies the colour of what it covers, and a browser answers it by drawing
 * the element into a surface of its own. A thousand of those is more than a table can hold, and
 * they are thrown away and drawn again every frame. Black laid over the texture at `1 - k` comes
 * to the same colour and is part of the same paint.
 *
 * The layer is one flat colour, so whatever size and repeat the texture is given suits it too.
 */
export function shadedBackgroundImage(url: string, brightness: number): string {
  const alpha = 1 - brightness;
  if (!(alpha > 0.0005)) return `url(${url})`;
  const black = `rgba(0,0,0,${alpha.toFixed(3)})`;
  return `linear-gradient(${black}, ${black}), url(${url})`;
}
