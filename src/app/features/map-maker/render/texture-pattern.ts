import { TextureId } from '@axe/features/map-maker/model/textures';

const MIN_TILE = 128;
const MAX_TILE = 256;

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
  const span = 2 * (Math.round(cellPx) || 0);
  return Math.max(MIN_TILE, Math.min(MAX_TILE, span || MIN_TILE));
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

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
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

function css(c: Rgb, alpha = 1): string {
  if (alpha >= 1) return `rgb(${clamp255(c.r)},${clamp255(c.g)},${clamp255(c.b)})`;
  return `rgba(${clamp255(c.r)},${clamp255(c.g)},${clamp255(c.b)},${alpha})`;
}

function shade(c: Rgb, amount: number): Rgb {
  return { r: c.r + amount, g: c.g + amount, b: c.b + amount };
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

function fillBase(ctx: CanvasRenderingContext2D, size: number, color: Rgb): void {
  ctx.fillStyle = css(color);
  ctx.fillRect(0, 0, size, size);
}

const LATTICE = 8;

type Noise = (x: number, y: number, octaves?: number) => number;

function makeNoise(seed: number): Noise {
  return (x, y, octaves = 3) => tileableValueNoise(x, y, seed, LATTICE, octaves);
}

function paintWash(
  ctx: CanvasRenderingContext2D,
  size: number,
  noise: Noise,
  scale: number,
  octaves: number,
  ramp: (n: number) => Rgb
): void {
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const f = (LATTICE * Math.max(1, scale)) / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = noise(x * f, y * f, octaves);
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

export function drawWrapped(
  ctx: CanvasRenderingContext2D,
  size: number,
  x: number,
  y: number,
  draw: (dx: number, dy: number) => void
): void {
  for (let i = -1; i <= 1; i += 1) {
    for (let j = -1; j <= 1; j += 1) {
      draw(x + i * size, y + j * size);
    }
  }
}

function shadeGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  light: Rgb,
  dark: Rgb
): CanvasGradient {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, css(light));
  grad.addColorStop(1, css(dark));
  return grad;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function roundedStonePath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rand: () => number
): void {
  const steps = 12;
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const jitter = 0.82 + rand() * 0.32;
    const px = cx + Math.cos(a) * rx * jitter;
    const py = cy + Math.sin(a) * ry * jitter;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function shadedStone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rand: () => number,
  light: Rgb,
  base: Rgb,
  dark: Rgb
): void {
  roundedStonePath(ctx, cx + ry * 0.12, cy + ry * 0.16, rx, ry, () => 0.95);
  ctx.fillStyle = css(dark, 0.5);
  ctx.fill();
  roundedStonePath(ctx, cx, cy, rx, ry, rand);
  ctx.fillStyle = css(base);
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - rx * 0.4, cy - ry * 0.4, rx * 0.1, cx, cy, rx);
  grad.addColorStop(0, css(light, 0.7));
  grad.addColorStop(1, css(light, 0));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = css(dark, 0.55);
  ctx.stroke();
}

function drawGrass(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const lo = hexToRgb('#9ed334');
  const hi = hexToRgb('#b7e34e');
  paintWash(ctx, size, noise, 3, 2, (n) => lerpRgb(lo, hi, n));
  const darkA = hexToRgb('#5d8c1f');
  const darkB = hexToRgb('#76a82a');
  const lightBlade = hexToRgb('#c8ec6a');
  const tufts = Math.round((size * size) / 360);
  ctx.lineCap = 'round';
  for (let i = 0; i < tufts; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const blades = 3 + Math.floor(rand() * 3);
    const lean = (rand() - 0.5) * 6;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      for (let b = 0; b < blades; b += 1) {
        const h = 6 + rand() * 6;
        const spread = (b / Math.max(1, blades - 1) - 0.5) * 8;
        const tipX = dx + spread + lean;
        const midX = dx + spread * 0.5 + lean * 0.4;
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = css(rand() > 0.5 ? darkA : darkB);
        ctx.beginPath();
        ctx.moveTo(dx + spread * 0.4, dy);
        ctx.quadraticCurveTo(midX, dy - h * 0.6, tipX, dy - h);
        ctx.stroke();
      }
      if (rand() > 0.4) {
        const h = 5 + rand() * 6;
        ctx.lineWidth = 1;
        ctx.strokeStyle = css(lightBlade);
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.quadraticCurveTo(dx + lean * 0.4, dy - h * 0.6, dx + lean, dy - h);
        ctx.stroke();
      }
    });
  }
  const dots = Math.round((size * size) / 2600);
  ctx.fillStyle = css(lightBlade, 0.7);
  for (let i = 0; i < dots; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      ctx.fillRect(dx, dy, 1, 1);
    });
  }
}

function drawWater(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const base = hexToRgb('#3ec9f5');
  const depth = hexToRgb('#28b6e8');
  paintWash(ctx, size, noise, 4, 3, (n) => lerpRgb(depth, base, smoothstep(n)));
  const ribbon = hexToRgb('#bdeffd');
  const white = hexToRgb('#ffffff');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const drawRibbon = (yBase: number, color: Rgb, width: number, alpha: number, freq: number): void => {
    const pts: { x: number; y: number }[] = [];
    const steps = Math.round(size / 6) + 4;
    for (let i = 0; i <= steps; i += 1) {
      const x = (i / steps) * size;
      const flow = (noise((x / size) * LATTICE * freq, yBase * 0.05, 3) - 0.5) * size * 0.5;
      pts.push({ x, y: yBase + flow });
    }
    drawWrapped(ctx, size, 0, 0, (dx, dy) => {
      ctx.lineWidth = width;
      ctx.strokeStyle = css(color, alpha);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 1) {
        const px = pts[i].x + dx;
        const py = pts[i].y + dy;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  };
  const ribbons = Math.max(3, Math.round(size / 26));
  for (let i = 0; i < ribbons; i += 1) {
    const y = ((i + rand() * 0.6) / ribbons) * size;
    drawRibbon(y, ribbon, 2.5, 0.7, 2 + rand());
    drawRibbon(y - 1, white, 1, 0.5, 2 + rand());
  }
  const sparkles = Math.round((size * size) / 5000);
  ctx.fillStyle = css(white, 0.85);
  for (let i = 0; i < sparkles; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    drawWrapped(ctx, size, x, y, (dx, dy) => ctx.fillRect(dx, dy, 1, 1));
  }
}

function drawStone(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  fillBase(ctx, size, hexToRgb('#7e8287'));
  paintWash(ctx, size, noise, 5, 2, (n) => shade(hexToRgb('#7e8287'), (n - 0.5) * 14));
  const lo = hexToRgb('#a9adb3');
  const hi = hexToRgb('#cfd3d8');
  const cells = Math.max(3, Math.round(size / 34));
  const step = size / cells;
  const gap = Math.max(2, Math.round(size / 64));
  for (let gy = 0; gy < cells; gy += 1) {
    for (let gx = 0; gx < cells; gx += 1) {
      const jx = (rand() - 0.5) * step * 0.18;
      const jy = (rand() - 0.5) * step * 0.18;
      const w = step - gap + (rand() - 0.5) * step * 0.12;
      const h = step - gap + (rand() - 0.5) * step * 0.12;
      const x = gx * step + gap * 0.5 + jx;
      const y = gy * step + gap * 0.5 + jy;
      const radius = 3 + rand() * 3;
      const tone = lerpRgb(lo, hi, rand());
      const light = shade(tone, 18);
      const dark = shade(tone, -28);
      drawWrapped(ctx, size, x, y, (dx, dy) => {
        roundedRectPath(ctx, dx, dy, w, h, radius);
        ctx.fillStyle = shadeGradient(ctx, dx, dy, w, h, light, dark);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = css(shade(tone, 30), 0.6);
        roundedRectPath(ctx, dx + 0.5, dy + 0.5, w - 1, h - 1, radius);
        ctx.stroke();
        ctx.strokeStyle = css(dark, 0.7);
        roundedRectPath(ctx, dx + 1, dy + 1.5, w - 1, h - 1, radius);
        ctx.stroke();
      });
      if (rand() > 0.7) {
        drawWrapped(ctx, size, x, y, (dx, dy) => {
          ctx.lineWidth = 1;
          ctx.strokeStyle = css(dark, 0.6);
          ctx.beginPath();
          ctx.moveTo(dx + w * 0.3, dy + h * 0.2);
          ctx.lineTo(dx + w * 0.5, dy + h * 0.6);
          ctx.lineTo(dx + w * 0.4, dy + h * 0.85);
          ctx.stroke();
        });
      }
    }
  }
}

function drawWood(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const base = hexToRgb('#d9a45e');
  const seam = hexToRgb('#6b4a26');
  const grain = hexToRgb('#b07c3c');
  fillBase(ctx, size, base);
  const cols = Math.max(2, Math.round(size / 56));
  const plankW = size / cols;
  for (let c = 0; c < cols; c += 1) {
    const x = c * plankW;
    const tone = (rand() - 0.5) * 0.16;
    const planks = 2 + Math.floor(rand() * 2);
    const stagger = (c % 2) * (size / planks / 2);
    const plankTone = shade(base, tone * 255);
    ctx.fillStyle = css(plankTone);
    ctx.fillRect(x, 0, plankW, size);
    const grad = ctx.createLinearGradient(x, 0, x + plankW, 0);
    grad.addColorStop(0, css(shade(plankTone, 14), 0.5));
    grad.addColorStop(0.5, css(shade(plankTone, 0), 0));
    grad.addColorStop(1, css(shade(plankTone, -22), 0.5));
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, plankW, size);
    const grains = 4 + Math.floor(rand() * 3);
    ctx.lineWidth = 1;
    ctx.strokeStyle = css(grain, 0.5);
    for (let g = 0; g < grains; g += 1) {
      const gx = x + ((g + 0.5) / grains) * plankW;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      for (let y = 0; y <= size; y += 6) {
        const wob = (noise((gx / size) * LATTICE * 4, (y / size) * LATTICE * 6, 2) - 0.5) * 4;
        ctx.lineTo(gx + wob, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = css(seam);
    ctx.fillRect(x, 0, 2, size);
    for (let p = 1; p < planks; p += 1) {
      const jy = wrap(stagger + (p / planks) * size, size);
      drawWrapped(ctx, size, x, jy, (dx, dy) => {
        ctx.fillStyle = css(seam);
        ctx.fillRect(dx, dy - 1, plankW, 2);
        ctx.fillStyle = css(shade(base, 22), 0.4);
        ctx.fillRect(dx, dy + 1, plankW, 1);
      });
    }
    if (rand() > 0.7) {
      const kx = x + plankW * (0.3 + rand() * 0.4);
      const ky = rand() * size;
      const kr = 3 + rand() * 3;
      const knot = shade(base, -90);
      drawWrapped(ctx, size, kx, ky, (dx, dy) => {
        const g2 = ctx.createRadialGradient(dx, dy, 0, dx, dy, kr);
        g2.addColorStop(0, css(knot, 0.9));
        g2.addColorStop(0.7, css(knot, 0.5));
        g2.addColorStop(1, css(knot, 0));
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.ellipse(dx, dy, kr, kr * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = css(knot, 0.5);
        ctx.beginPath();
        ctx.ellipse(dx, dy, kr * 1.5, kr * 1.9, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }
}

function drawSand(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const base = hexToRgb('#ecd9a0');
  const dune = hexToRgb('#dcc183');
  paintWash(ctx, size, noise, 2, 2, (n) => lerpRgb(dune, base, smoothstep(n)));
  const lightSpeck = hexToRgb('#fbeebd');
  const darkSpeck = hexToRgb('#cbb274');
  const specks = Math.round((size * size) / 26);
  for (let i = 0; i < specks; i += 1) {
    ctx.fillStyle = css(rand() > 0.5 ? lightSpeck : darkSpeck, 0.7);
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
  const pebble = hexToRgb('#c9ab6e');
  const grains = Math.round((size * size) / 1300);
  for (let i = 0; i < grains; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 1.5;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      ctx.fillStyle = css(shade(pebble, -36), 0.5);
      ctx.beginPath();
      ctx.ellipse(dx + 0.6, dy + 0.8, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(pebble);
      ctx.beginPath();
      ctx.ellipse(dx, dy, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(shade(pebble, 26), 0.6);
      ctx.beginPath();
      ctx.ellipse(dx - r * 0.3, dy - r * 0.3, r * 0.4, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function drawDirt(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const base = hexToRgb('#3a2f26');
  const deep = hexToRgb('#2a221c');
  paintWash(ctx, size, noise, 6, 3, (n) => lerpRgb(deep, base, smoothstep(n)));
  const clodA = hexToRgb('#4a3c30');
  const clodB = hexToRgb('#57483a');
  const clods = Math.round((size * size) / 700);
  for (let i = 0; i < clods; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2 + rand() * 2;
    const tone = rand() > 0.5 ? clodA : clodB;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      shadedStone(ctx, dx, dy, r, r * 0.85, rand, shade(tone, 28), tone, shade(tone, -30));
    });
  }
  const crackC = hexToRgb('#221b15');
  const cracks = Math.max(2, Math.round(size / 64));
  ctx.lineCap = 'round';
  for (let i = 0; i < cracks; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const len = size * (0.15 + rand() * 0.2);
    const ang = rand() * Math.PI * 2;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      ctx.lineWidth = 1;
      ctx.strokeStyle = css(crackC, 0.7);
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      let px = dx;
      let py = dy;
      const segs = 5;
      for (let s = 1; s <= segs; s += 1) {
        const a = ang + (rand() - 0.5) * 1.2;
        px += (Math.cos(a) * len) / segs;
        py += (Math.sin(a) * len) / segs;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, size: number, rand: () => number, _noise: Noise): void {
  fillBase(ctx, size, hexToRgb('#cbc6ba'));
  const lo = hexToRgb('#a84a35');
  const hi = hexToRgb('#c26b4f');
  const highlight = hexToRgb('#d8826a');
  const shadow = hexToRgb('#7c2f1e');
  const rows = Math.max(3, Math.round(size / 26));
  const brickH = size / rows;
  const brickW = brickH * 2.2;
  const gap = Math.max(2, Math.round(size / 56));
  for (let r = 0; r < rows; r += 1) {
    const y = r * brickH;
    const offset = (r % 2 === 0 ? 0 : -brickW / 2) - brickW;
    for (let x = offset; x < size + brickW; x += brickW) {
      const tone = lerpRgb(lo, hi, rand());
      const bx = x + gap * 0.5;
      const by = y + gap * 0.5;
      const bw = brickW - gap;
      const bh = brickH - gap;
      drawWrapped(ctx, size, bx, by, (dx, dy) => {
        roundedRectPath(ctx, dx, dy, bw, bh, 2);
        ctx.fillStyle = css(tone);
        ctx.fill();
        const blots = 3;
        for (let s = 0; s < blots; s += 1) {
          const sx = dx + rand() * bw;
          const sy = dy + rand() * bh;
          ctx.fillStyle = css(shade(tone, (rand() - 0.5) * 50), 0.18);
          ctx.beginPath();
          ctx.ellipse(sx, sy, bw * 0.18, bh * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = css(highlight, 0.5);
        ctx.beginPath();
        ctx.moveTo(dx + 1, dy + 1);
        ctx.lineTo(dx + bw - 1, dy + 1);
        ctx.stroke();
        ctx.strokeStyle = css(shadow, 0.5);
        ctx.beginPath();
        ctx.moveTo(dx + 1, dy + bh - 1);
        ctx.lineTo(dx + bw - 1, dy + bh - 1);
        ctx.stroke();
      });
    }
  }
}

function drawTile(ctx: CanvasRenderingContext2D, size: number, rand: () => number, _noise: Noise): void {
  fillBase(ctx, size, hexToRgb('#9a9c9b'));
  const light = hexToRgb('#c8cac9');
  const dark = hexToRgb('#b5b7b6');
  const cells = Math.max(2, Math.round(size / 64));
  const cellW = size / cells;
  const grout = Math.max(2, Math.round(size / 64));
  for (let gy = 0; gy < cells; gy += 1) {
    for (let gx = 0; gx < cells; gx += 1) {
      const x = gx * cellW + grout * 0.5;
      const y = gy * cellW + grout * 0.5;
      const w = cellW - grout;
      const h = cellW - grout;
      const tint = (rand() - 0.5) * 8;
      ctx.fillStyle = shadeGradient(ctx, x, y, w, h, shade(light, tint), shade(dark, tint));
      ctx.fillRect(x, y, w, h);
      const stains = 2 + Math.floor(rand() * 2);
      for (let s = 0; s < stains; s += 1) {
        const sx = x + rand() * w;
        const sy = y + rand() * h;
        ctx.fillStyle = css(shade(dark, -40), 0.08);
        ctx.beginPath();
        ctx.ellipse(sx, sy, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = css(shade(light, 20), 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();
    }
  }
}

function drawLava(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const glowLo = hexToRgb('#ff9b1a');
  const glowHi = hexToRgb('#ffd23e');
  const core = hexToRgb('#fff3c0');
  paintWash(ctx, size, noise, 4, 3, (n) => lerpRgb(glowLo, glowHi, smoothstep(n)));
  const coreNet = Math.round((size * size) / 1400);
  for (let i = 0; i < coreNet; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 5;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
      g.addColorStop(0, css(core, 0.9));
      g.addColorStop(1, css(core, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  const basalt = hexToRgb('#5a1f10');
  const rim = hexToRgb('#c43c10');
  const islands = Math.round((size * size) / 2400);
  for (let i = 0; i < islands; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 8 + rand() * 12;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      const glow = ctx.createRadialGradient(dx, dy, r * 0.7, dx, dy, r * 1.6);
      glow.addColorStop(0, css(glowLo, 0.45));
      glow.addColorStop(1, css(glowLo, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(dx, dy, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
      roundedStonePath(ctx, dx, dy, r * 1.05, r * 0.95, rand);
      const rimGrad = ctx.createRadialGradient(dx, dy, r * 0.5, dx, dy, r * 1.05);
      rimGrad.addColorStop(0, css(basalt));
      rimGrad.addColorStop(0.8, css(basalt));
      rimGrad.addColorStop(1, css(rim));
      ctx.fillStyle = rimGrad;
      ctx.fill();
      roundedStonePath(ctx, dx - r * 0.2, dy - r * 0.2, r * 0.55, r * 0.5, () => 0.95);
      ctx.fillStyle = css(shade(basalt, 22), 0.6);
      ctx.fill();
    });
  }
}

function drawSnow(ctx: CanvasRenderingContext2D, size: number, rand: () => number, noise: Noise): void {
  const base = hexToRgb('#f4f7fb');
  const drift = hexToRgb('#dbe4f0');
  paintWash(ctx, size, noise, 3, 2, (n) => lerpRgb(drift, base, smoothstep(n)));
  const dips = Math.round((size * size) / 2600);
  for (let i = 0; i < dips; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 5;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      ctx.fillStyle = css(drift, 0.25);
      ctx.beginPath();
      ctx.ellipse(dx, dy, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css({ r: 255, g: 255, b: 255 }, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(dx, dy - r * 0.3, r * 0.9, r * 0.5, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    });
  }
  const sparkles = Math.round((size * size) / 1600);
  ctx.strokeStyle = css({ r: 255, g: 255, b: 255 }, 1);
  ctx.lineWidth = 1;
  for (let i = 0; i < sparkles; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    drawWrapped(ctx, size, x, y, (dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(dx - 1.5, dy);
      ctx.lineTo(dx + 1.5, dy);
      ctx.moveTo(dx, dy - 1.5);
      ctx.lineTo(dx, dy + 1.5);
      ctx.stroke();
    });
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
