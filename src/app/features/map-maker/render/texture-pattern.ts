import { TEXTURE_BASE_COLOR, TextureId } from '@axe/features/map-maker/model/textures';

const MIN_TILE = 32;
const MAX_TILE = 128;

const tileCache = new Map<string, HTMLCanvasElement>();
const latticeCache = new Map<string, Float64Array>();

function createLcg(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function seedFromId(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function tileSize(cellPx: number): number {
  return Math.max(MIN_TILE, Math.min(MAX_TILE, Math.round(cellPx) || MIN_TILE));
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function wrap(value: number, n: number): number {
  return ((value % n) + n) % n;
}

function lattice(seed: number, n: number): Float64Array {
  const key = `${seed >>> 0}|${n}`;
  const cached = latticeCache.get(key);
  if (cached) return cached;
  const values = new Float64Array(n * n);
  const rand = createLcg(seed ^ Math.imul(n, 0x9e3779b1));
  for (let i = 0; i < values.length; i += 1) values[i] = rand();
  latticeCache.set(key, values);
  return values;
}

function valueNoiseLayer(x: number, y: number, seed: number, n: number): number {
  const values = lattice(seed, n);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const ix0 = wrap(x0, n);
  const iy0 = wrap(y0, n);
  const ix1 = wrap(x0 + 1, n);
  const iy1 = wrap(y0 + 1, n);
  const v00 = values[iy0 * n + ix0];
  const v10 = values[iy0 * n + ix1];
  const v01 = values[iy1 * n + ix0];
  const v11 = values[iy1 * n + ix1];
  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy;
}

export function tileableValueNoise(x: number, y: number, seed: number, latticeSize: number, octaves = 1): number {
  const n = Math.max(2, Math.round(latticeSize));
  const oct = Math.max(1, Math.round(octaves));
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let total = 0;
  for (let o = 0; o < oct; o += 1) {
    sum += valueNoiseLayer(x * frequency, y * frequency, (seed ^ Math.imul(o + 1, 0x85ebca6b)) >>> 0, n) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / total;
}

function createOffscreen(size: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function clamp255(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(normalized.slice(0, 6), 16);
  if (Number.isNaN(num)) return { r: 128, g: 128, b: 128 };
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

function rgb(r: number, g: number, b: number): string {
  return `rgb(${clamp255(r)},${clamp255(g)},${clamp255(b)})`;
}

function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgb(r + amount, g + amount, b + amount);
}

function mix(hex: string, target: { r: number; g: number; b: number }, t: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgb(r + (target.r - r) * t, g + (target.g - g) * t, b + (target.b - b) * t);
}

function lerpRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function fillBase(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
}

const LATTICE = 8;

type Noise = (x: number, y: number, octaves?: number) => number;

function makeNoise(seed: number): Noise {
  return (x, y, octaves = 3) => tileableValueNoise(x, y, seed, LATTICE, octaves);
}

function paintFbm(
  ctx: CanvasRenderingContext2D,
  size: number,
  noise: Noise,
  detail: number,
  ramp: (n: number) => { r: number; g: number; b: number }
): void {
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const f = (LATTICE * Math.max(1, Math.round(detail))) / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = noise(x * f, y * f);
      const { r, g, b } = ramp(n);
      const o = (y * size + x) * 4;
      data[o] = clamp255(r);
      data[o + 1] = clamp255(g);
      data[o + 2] = clamp255(b);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function sn(noise: Noise, x: number, y: number, size: number, detail: number, octaves = 2): number {
  const d = Math.max(1, Math.round(detail));
  return noise((x / size) * LATTICE * d, (y / size) * LATTICE * d, octaves);
}

function wrappedDist(ax: number, ay: number, bx: number, by: number, size: number): number {
  let dx = Math.abs(ax - bx);
  let dy = Math.abs(ay - by);
  if (dx > size / 2) dx = size - dx;
  if (dy > size / 2) dy = size - dy;
  return Math.hypot(dx, dy);
}

function drawGrass(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const dark = hexToRgb(shade(TEXTURE_BASE_COLOR.grass, -32));
  const mid = hexToRgb(TEXTURE_BASE_COLOR.grass);
  const light = hexToRgb(shade(TEXTURE_BASE_COLOR.grass, 34));
  const yellow = { r: 150, g: 160, b: 70 };
  paintFbm(ctx, size, noise, 6, (n) => {
    if (n < 0.45) return lerpRgb(dark, mid, n / 0.45);
    if (n < 0.78) return lerpRgb(mid, light, (n - 0.45) / 0.33);
    return lerpRgb(light, yellow, (n - 0.78) / 0.22);
  });
  const blades = Math.round(size * 1.6);
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < blades; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const h = 2 + rand() * 4;
    const lean = (sn(noise, x, y, size, 6, 3) - 0.5) * 4;
    ctx.strokeStyle = shade(TEXTURE_BASE_COLOR.grass, rand() > 0.5 ? 30 : -28);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - h);
    ctx.stroke();
  }
}

function drawWater(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const deep = hexToRgb(shade(TEXTURE_BASE_COLOR.water, -34));
  const base = hexToRgb(TEXTURE_BASE_COLOR.water);
  const crest = hexToRgb(shade(TEXTURE_BASE_COLOR.water, 50));
  const bands = 4;
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const warp = (sn(noise, x, y, size, 5, 3) - 0.5) * 6;
      const wave = Math.sin(((y + warp) / size) * Math.PI * 2 * bands) * 0.5 + 0.5;
      const fine = sn(noise, x, y, size, 8, 2);
      let color = lerpRgb(deep, base, wave);
      if (wave > 0.82) color = lerpRgb(color, crest, (wave - 0.82) / 0.18);
      color = lerpRgb(color, crest, fine * 0.12);
      const o = (y * size + x) * 4;
      data[o] = clamp255(color.r);
      data[o + 1] = clamp255(color.g);
      data[o + 2] = clamp255(color.b);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function drawStone(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const base = TEXTURE_BASE_COLOR.stone;
  const cells = Math.max(4, Math.round(size / 14));
  const pts: { x: number; y: number; tone: number }[] = [];
  const step = size / cells;
  for (let gy = 0; gy < cells; gy += 1) {
    for (let gx = 0; gx < cells; gx += 1) {
      pts.push({
        x: (gx + 0.2 + rand() * 0.6) * step,
        y: (gy + 0.2 + rand() * 0.6) * step,
        tone: (rand() - 0.45) * 46,
      });
    }
  }
  const mortar = hexToRgb(shade(base, -42));
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let best = Infinity;
      let second = Infinity;
      let tone = 0;
      let near = pts[0];
      for (const p of pts) {
        const d = wrappedDist(x, y, p.x, p.y, size);
        if (d < best) {
          second = best;
          best = d;
          tone = p.tone;
          near = p;
        } else if (d < second) {
          second = d;
        }
      }
      const edge = second - best;
      const grain = (sn(noise, x, y, size, 10, 2) - 0.5) * 22;
      let color = hexToRgb(shade(base, tone + grain));
      const light = best < step * 0.5 && x < near.x && y < near.y ? 16 : 0;
      color = { r: color.r + light, g: color.g + light, b: color.b + light };
      if (edge < 1.5) color = mortar;
      const o = (y * size + x) * 4;
      data[o] = clamp255(color.r);
      data[o + 1] = clamp255(color.g);
      data[o + 2] = clamp255(color.b);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function drawWood(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const base = TEXTURE_BASE_COLOR.wood;
  const planks = Math.max(2, Math.round(size / 22));
  const plankW = size / planks;
  const tones: number[] = [];
  for (let p = 0; p < planks; p += 1) tones.push((rand() - 0.5) * 38);
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const plank = Math.floor(x / plankW);
      const local = x - plank * plankW;
      const grain = (noise((y / size) * LATTICE * 18, (x / size) * LATTICE * 3, 2) - 0.5) * 40;
      let amt = tones[plank % planks] + grain;
      if (local < 1 || local > plankW - 1) amt -= 50;
      const color = hexToRgb(shade(base, amt));
      const o = (y * size + x) * 4;
      data[o] = clamp255(color.r);
      data[o + 1] = clamp255(color.g);
      data[o + 2] = clamp255(color.b);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const knots = Math.max(1, Math.round(planks / 2));
  for (let i = 0; i < knots; i += 1) {
    const plank = Math.floor(rand() * planks);
    const cx = (plank + 0.3 + rand() * 0.4) * plankW;
    const cy = rand() * size;
    const r = 2 + rand() * 3;
    const dark = hexToRgb(shade(base, -70));
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(${dark.r},${dark.g},${dark.b},0.85)`);
    grad.addColorStop(1, `rgba(${dark.r},${dark.g},${dark.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSand(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const dark = hexToRgb(shade(TEXTURE_BASE_COLOR.sand, -26));
  const base = hexToRgb(TEXTURE_BASE_COLOR.sand);
  const light = hexToRgb(shade(TEXTURE_BASE_COLOR.sand, 24));
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dune = noise((x / size) * LATTICE * 3, (y / size) * LATTICE * 2, 2);
      const grain = sn(noise, x, y, size, 18, 2);
      let color = lerpRgb(dark, light, dune);
      color = lerpRgb(color, base, (grain - 0.5) * 0.5 + 0.5);
      const o = (y * size + x) * 4;
      data[o] = clamp255(color.r);
      data[o + 1] = clamp255(color.g);
      data[o + 2] = clamp255(color.b);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const pebbles = Math.round(size * 0.4);
  for (let i = 0; i < pebbles; i += 1) {
    ctx.fillStyle = shade(TEXTURE_BASE_COLOR.sand, -40 - rand() * 20);
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
}

function drawDirt(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const dark = hexToRgb(shade(TEXTURE_BASE_COLOR.dirt, -34));
  const base = hexToRgb(TEXTURE_BASE_COLOR.dirt);
  const light = hexToRgb(shade(TEXTURE_BASE_COLOR.dirt, 30));
  paintFbm(ctx, size, noise, 7, (n) => lerpRgb(n < 0.3 ? dark : base, light, n * 0.7));
  const stones = Math.round(size * 0.25);
  for (let i = 0; i < stones; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 1.8;
    ctx.fillStyle = shade(TEXTURE_BASE_COLOR.dirt, rand() > 0.5 ? 40 : -50);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, size: number, rand: () => number, _noise: Noise): void {
  const base = TEXTURE_BASE_COLOR.brick;
  const mortar = shade(base, -52);
  fillBase(ctx, size, mortar);
  const rows = Math.max(2, Math.round(size / 18));
  const brickH = size / rows;
  const brickW = size / 2;
  const gap = Math.max(1, Math.round(size / 48));
  for (let r = 0; r < rows; r += 1) {
    const y = r * brickH;
    const offset = r % 2 === 0 ? 0 : -brickW / 2;
    for (let x = offset; x < size; x += brickW) {
      const tone = (rand() - 0.5) * 36;
      const grad = ctx.createLinearGradient(0, y, 0, y + brickH);
      grad.addColorStop(0, shade(base, tone + 16));
      grad.addColorStop(1, shade(base, tone - 14));
      ctx.fillStyle = grad;
      ctx.fillRect(x + gap, y + gap, brickW - gap * 2, brickH - gap * 2);
      const speckles = Math.round(brickW * 0.5);
      for (let s = 0; s < speckles; s += 1) {
        const sx = x + gap + rand() * (brickW - gap * 2);
        const sy = y + gap + rand() * (brickH - gap * 2);
        ctx.fillStyle = shade(base, tone + (rand() - 0.5) * 40);
        ctx.fillRect(sx, sy, 1, 1);
      }
    }
  }
}

function drawTile(ctx: CanvasRenderingContext2D, size: number, rand: () => number, _noise: Noise): void {
  const base = TEXTURE_BASE_COLOR.tile;
  const grout = shade(base, -44);
  fillBase(ctx, size, grout);
  const cells = Math.max(2, Math.round(size / 20));
  const cellW = size / cells;
  const gap = Math.max(1, Math.round(size / 64));
  for (let gy = 0; gy < cells; gy += 1) {
    for (let gx = 0; gx < cells; gx += 1) {
      const x = gx * cellW;
      const y = gy * cellW;
      const tone = (rand() - 0.5) * 22;
      const grad = ctx.createLinearGradient(x, y, x + cellW, y + cellW);
      grad.addColorStop(0, shade(base, tone + 12));
      grad.addColorStop(1, shade(base, tone - 10));
      ctx.fillStyle = grad;
      ctx.fillRect(x + gap, y + gap, cellW - gap * 2, cellW - gap * 2);
    }
  }
}

function drawLava(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const basalt = hexToRgb(shade(TEXTURE_BASE_COLOR.lava, -130));
  const basaltLight = hexToRgb(shade(TEXTURE_BASE_COLOR.lava, -95));
  const orange = { r: 255, g: 140, b: 30 };
  const yellow = { r: 255, g: 230, b: 120 };
  const image = ctx.createImageData(size, size);
  const data = image.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = sn(noise, x, y, size, 5, 3);
      const ridge = Math.abs(n - 0.5);
      let color = lerpRgb(basalt, basaltLight, n);
      if (ridge < 0.16) {
        const glow = 1 - ridge / 0.16;
        const hot = lerpRgb(orange, yellow, glow);
        color = lerpRgb(color, hot, Math.pow(glow, 0.6));
      } else if (ridge < 0.26) {
        const glow = (0.26 - ridge) / 0.1;
        color = lerpRgb(color, orange, glow * 0.4);
      }
      const o = (y * size + x) * 4;
      data[o] = clamp255(color.r);
      data[o + 1] = clamp255(color.g);
      data[o + 2] = clamp255(color.b);
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function drawSnow(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const base = hexToRgb(TEXTURE_BASE_COLOR.snow);
  const shadow = { r: 188, g: 204, b: 232 };
  const white = { r: 252, g: 254, b: 255 };
  paintFbm(ctx, size, noise, 6, (n) => {
    if (n < 0.4) return lerpRgb(shadow, base, n / 0.4);
    return lerpRgb(base, white, (n - 0.4) / 0.6);
  });
  const sparkles = Math.round(size * 0.3);
  for (let i = 0; i < sparkles; i += 1) {
    ctx.fillStyle = rand() > 0.4 ? rgb(255, 255, 255) : mix(TEXTURE_BASE_COLOR.snow, shadow, 0.5);
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
}

const PAINTERS: Record<
  TextureId,
  (ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise) => void
> = {
  grass: drawGrass,
  water: drawWater,
  stone: drawStone,
  wood: drawWood,
  sand: drawSand,
  dirt: drawDirt,
  brick: drawBrick,
  tile: drawTile,
  lava: drawLava,
  snow: drawSnow,
};

function buildTile(id: TextureId, size: number): HTMLCanvasElement | null {
  const canvas = createOffscreen(size);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const seed = (seedFromId(id) ^ Math.imul(size, 2654435761)) >>> 0;
  const rand = createLcg(seed);
  const noise = makeNoise(seed);
  const painter = PAINTERS[id] ?? drawGrass;
  if (typeof ctx.createImageData === 'function' && typeof ctx.putImageData === 'function') {
    painter(ctx, size, rand, noise);
  } else {
    fillBase(ctx, size, TEXTURE_BASE_COLOR[id] ?? TEXTURE_BASE_COLOR.grass);
  }
  return canvas;
}

export function createTexturePattern(
  ctx: CanvasRenderingContext2D,
  id: TextureId,
  cellPx: number
): CanvasPattern | null {
  if (!ctx || typeof ctx.createPattern !== 'function') return null;
  const size = tileSize(cellPx);
  const key = `${id}|${size}`;
  let tile = tileCache.get(key);
  if (!tile) {
    const built = buildTile(id, size);
    if (!built) return null;
    tile = built;
    tileCache.set(key, tile);
  }
  try {
    return ctx.createPattern(tile, 'repeat');
  } catch {
    return null;
  }
}

export function createImageTexturePattern(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  cellPx: number
): CanvasPattern | null {
  if (!ctx || typeof ctx.createPattern !== 'function' || !image) return null;
  let pattern: CanvasPattern | null;
  try {
    pattern = ctx.createPattern(image, 'repeat');
  } catch {
    return null;
  }
  if (!pattern) return null;
  const source = image as { width?: number; height?: number };
  const w = typeof source.width === 'number' ? source.width : 0;
  const h = typeof source.height === 'number' ? source.height : 0;
  if (w > 0 && h > 0 && typeof DOMMatrix !== 'undefined' && typeof pattern.setTransform === 'function') {
    const span = 2 * (cellPx > 0 ? cellPx : MIN_TILE);
    pattern.setTransform(new DOMMatrix().scale(span / w, span / h));
  }
  return pattern;
}

export function clearTextureTileCache(): void {
  tileCache.clear();
  latticeCache.clear();
}
