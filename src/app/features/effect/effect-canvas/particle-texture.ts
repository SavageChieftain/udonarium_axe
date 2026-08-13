import { ParticleShape } from '@axe/domain/effect/effect-particles';
import { withAlpha } from '@axe/domain/effect/particles/shared';

export { withAlpha };

/**
 * 柔らかい粒のテクスチャを色ごとに焼いてキャッシュする。
 *
 * 粒 1 つずつに createRadialGradient を呼ぶと重いうえ、縁が硬いと枚数を重ねても
 * 濃淡が出ない。あらかじめ中心が白く外周へ落ちる円を作り、それを拡大して使う。
 */

const TEXTURE_SIZE = 128;
const cache = new Map<string, HTMLCanvasElement>();

export function particleTexture(shape: ParticleShape, color: string): HTMLCanvasElement | null {
  const key = `${shape}:${color}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return null;

  const half = TEXTURE_SIZE / 2;

  if (shape === 'chunk') {
    drawChunk(context, TEXTURE_SIZE, color);
    cache.set(key, canvas);
    return canvas;
  }

  const gradient = context.createRadialGradient(half, half, 0, half, half, half);

  if (shape === 'smoke') {
    // 煙は芯を持たせず、輪郭をぼかしたまま広く薄く。
    gradient.addColorStop(0, withAlpha(color, 0.85));
    gradient.addColorStop(0.45, withAlpha(color, 0.4));
    gradient.addColorStop(1, withAlpha(color, 0));
  } else {
    gradient.addColorStop(0, withAlpha('#ffffff', 1));
    gradient.addColorStop(0.18, withAlpha(color, 0.95));
    gradient.addColorStop(0.5, withAlpha(color, 0.35));
    gradient.addColorStop(1, withAlpha(color, 0));
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  cache.set(key, canvas);
  return canvas;
}

export function clearParticleTextureCache(): void {
  cache.clear();
}

/** 砕けた岩。輪郭を持たせたいので、ぼかさず多角形で塗る。 */
function drawChunk(context: CanvasRenderingContext2D, size: number, color: string): void {
  const points = [
    [0.5, 0.06],
    [0.86, 0.3],
    [0.94, 0.66],
    [0.62, 0.95],
    [0.24, 0.88],
    [0.06, 0.5],
    [0.2, 0.18],
  ];

  context.beginPath();
  points.forEach(([x, y], index) => {
    const pointX = x * size;
    const pointY = y * size;
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  });
  context.closePath();
  context.fillStyle = color;
  context.fill();

  // 上面だけ明るくして立体に見せる。
  context.beginPath();
  context.moveTo(0.5 * size, 0.06 * size);
  context.lineTo(0.86 * size, 0.3 * size);
  context.lineTo(0.55 * size, 0.46 * size);
  context.lineTo(0.2 * size, 0.18 * size);
  context.closePath();
  context.fillStyle = withAlpha('#ffffff', 0.24);
  context.fill();
}

function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
