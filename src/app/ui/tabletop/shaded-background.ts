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
  const black = shadeOf(brightness);
  if (!black) return `url(${url})`;
  return `linear-gradient(${black}, ${black}), url(${url})`;
}

/** How the texture itself is laid on the face: stretched over it, or tiled at a cell a piece. */
export interface TextureLayout {
  size: string;
  repeat: string;
}

export const STRETCHED_TEXTURE: TextureLayout = { size: '100% 100%', repeat: 'no-repeat' };

export interface ShadedBackground {
  /** The `background-image`: the shade, then the texture under it. */
  image: string;
  /** The size, position and repeat of every one of those layers. */
  style: Record<string, string>;
}

interface ShadeLayer {
  image: string;
  size: string;
  position: string;
}

const SAME_SHADE_EPSILON = 0.004;

/**
 * A texture darkened cell by cell, over a grid of readings laid out row by row.
 *
 * One figure for a whole face cannot say what a wall looks like: a wall is lit where a lamp
 * reaches it and dark everywhere else, and a wall gathered from a dozen cells is most of a
 * room long. A gradient runs one way only, so a face with more than one row is shaded a row
 * at a time, each row's gradient laid across its own band of the face.
 *
 * Each reading stands for its own stretch of a row and is placed in the middle of it, so the
 * first and the last hold out to the ends of their own accord: a gradient keeps its first
 * colour before the first stop and its last after the last.
 */
export function shadedBackgroundGrid(
  url: string,
  brightnesses: readonly number[],
  cols: number,
  rows: number,
  texture: TextureLayout = STRETCHED_TEXTURE
): ShadedBackground {
  if (brightnesses.length < 1) return assemble([], url, texture);
  const first = brightnesses[0];
  if (brightnesses.every((value) => Math.abs(value - first) <= SAME_SHADE_EPSILON)) {
    const black = shadeOf(first);
    if (!black) return assemble([], url, texture);
    return assemble(
      [{ image: `linear-gradient(${black}, ${black})`, size: '100% 100%', position: '0 0' }],
      url,
      texture
    );
  }
  const across = Math.max(1, cols);
  const down = Math.max(1, rows);
  const layers: ShadeLayer[] = [];
  for (let row = 0; row < down; row++) {
    const line = brightnesses.slice(row * across, (row + 1) * across);
    const stops = line.map((brightness, index) => {
      const alpha = Math.max(0, Math.min(1, 1 - brightness));
      return `rgba(0,0,0,${alpha.toFixed(3)}) ${percent(((index + 0.5) / across) * 100)}`;
    });
    layers.push({
      image: `linear-gradient(to right, ${stops.join(', ')})`,
      size: down > 1 ? `100% ${percent(100 / down)}` : '100% 100%',
      position: down > 1 ? `0 ${percent((row / (down - 1)) * 100)}` : '0 0',
    });
  }
  return assemble(layers, url, texture);
}

function shadeOf(brightness: number): string | null {
  const alpha = 1 - brightness;
  if (!(alpha > 0.0005)) return null;
  return `rgba(0,0,0,${alpha.toFixed(3)})`;
}

function percent(value: number): string {
  return `${Math.round(value * 10000) / 10000}%`;
}

function assemble(layers: readonly ShadeLayer[], url: string, texture: TextureLayout): ShadedBackground {
  return {
    image: [...layers.map((layer) => layer.image), `url(${url})`].join(', '),
    style: {
      'background-size': [...layers.map((layer) => layer.size), texture.size].join(', '),
      'background-position': [...layers.map((layer) => layer.position), '0 0'].join(', '),
      'background-repeat': [...layers.map(() => 'no-repeat'), texture.repeat].join(', '),
    },
  };
}
