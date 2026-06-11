import { TEXTURE_BASE_COLOR, TextureId } from '@axe/features/map-maker/model/textures';

const MIN_TILE = 32;
const MAX_TILE = 128;

const tileCache = new Map<string, HTMLCanvasElement>();

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
  const size = Math.max(MIN_TILE, Math.min(MAX_TILE, Math.round(cellPx) || MIN_TILE));
  return size;
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

function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp255(r + amount)},${clamp255(g + amount)},${clamp255(b + amount)})`;
}

function mix(hex: string, target: { r: number; g: number; b: number }, t: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${clamp255(r + (target.r - r) * t)},${clamp255(g + (target.g - g) * t)},${clamp255(b + (target.b - b) * t)})`;
}

function fillBase(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
}

function drawGrass(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.grass;
  fillBase(ctx, size, base);
  const blobs = Math.round(size * 1.5);
  for (let i = 0; i < blobs; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 2.5;
    ctx.fillStyle = shade(base, Math.round((rand() - 0.5) * 70));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWater(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.water;
  fillBase(ctx, size, base);
  const bands = Math.max(4, Math.round(size / 6));
  for (let i = 0; i <= bands; i += 1) {
    const y = (i / bands) * size;
    ctx.strokeStyle = shade(base, i % 2 === 0 ? 28 : -22);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    const seg = Math.max(2, Math.round(size / 8));
    for (let x = 0; x <= size; x += seg) {
      const wave = Math.sin((x / size) * Math.PI * 2 + i) * 2 + (rand() - 0.5) * 1.5;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
}

function drawStone(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.stone;
  fillBase(ctx, size, shade(base, -18));
  const cobbles = Math.max(6, Math.round(size / 6));
  for (let i = 0; i < cobbles; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const rx = 3 + rand() * 5;
    const ry = 3 + rand() * 5;
    ctx.fillStyle = shade(base, Math.round((rand() - 0.4) * 50));
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade(base, -40);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawWood(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.wood;
  fillBase(ctx, size, base);
  const planks = Math.max(2, Math.round(size / 16));
  const plankW = size / planks;
  for (let p = 0; p <= planks; p += 1) {
    const x = p * plankW;
    ctx.fillStyle = shade(base, Math.round((rand() - 0.5) * 40));
    ctx.fillRect(x, 0, plankW, size);
    ctx.strokeStyle = shade(base, -55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let i = 0; i < size; i += 1) {
    if (rand() > 0.7) {
      const y = rand() * size;
      ctx.strokeStyle = shade(base, -25);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  }
}

function drawSand(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.sand;
  fillBase(ctx, size, base);
  const specks = size * size * 0.4;
  for (let i = 0; i < specks; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = shade(base, Math.round((rand() - 0.5) * 50));
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawDirt(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.dirt;
  fillBase(ctx, size, base);
  const blobs = size * size * 0.2;
  for (let i = 0; i < blobs; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = rand() * 1.6;
    ctx.fillStyle = shade(base, Math.round((rand() - 0.5) * 60));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBrick(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.brick;
  const mortar = shade(base, -55);
  fillBase(ctx, size, mortar);
  const rows = Math.max(2, Math.round(size / 16));
  const brickH = size / rows;
  const brickW = size / 2;
  for (let r = 0; r < rows; r += 1) {
    const y = r * brickH;
    const offset = r % 2 === 0 ? 0 : -brickW / 2;
    for (let x = offset; x < size; x += brickW) {
      ctx.fillStyle = shade(base, Math.round((rand() - 0.5) * 36));
      ctx.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
    }
  }
}

function drawTile(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.tile;
  const grout = shade(base, -45);
  fillBase(ctx, size, grout);
  const cells = Math.max(2, Math.round(size / 16));
  const cellW = size / cells;
  for (let gy = 0; gy < cells; gy += 1) {
    for (let gx = 0; gx < cells; gx += 1) {
      ctx.fillStyle = shade(base, Math.round((rand() - 0.5) * 24));
      ctx.fillRect(gx * cellW + 1, gy * cellW + 1, cellW - 2, cellW - 2);
    }
  }
}

function drawLava(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.lava;
  fillBase(ctx, size, shade(base, -120));
  const glow = { r: 255, g: 180, b: 40 };
  const cracks = Math.max(4, Math.round(size / 8));
  for (let i = 0; i < cracks; i += 1) {
    let x = rand() * size;
    let y = rand() * size;
    ctx.strokeStyle = mix(base, glow, 0.7);
    ctx.lineWidth = 1 + rand() * 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 3 + Math.round(rand() * 4);
    for (let s = 0; s < steps; s += 1) {
      x += (rand() - 0.5) * size * 0.4;
      y += (rand() - 0.5) * size * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawSnow(ctx: CanvasRenderingContext2D, size: number, rand: () => number): void {
  const base = TEXTURE_BASE_COLOR.snow;
  fillBase(ctx, size, base);
  const blue = { r: 180, g: 200, b: 235 };
  const specks = size * size * 0.15;
  for (let i = 0; i < specks; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? mix(base, blue, 0.4) : shade(base, 12);
    ctx.fillRect(x, y, 1, 1);
  }
}

const PAINTERS: Record<TextureId, (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void> = {
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
  const painter = PAINTERS[id] ?? drawGrass;
  const rand = createLcg(seedFromId(id) ^ Math.imul(size, 2654435761));
  painter(ctx, size, rand);
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

export function clearTextureTileCache(): void {
  tileCache.clear();
}
