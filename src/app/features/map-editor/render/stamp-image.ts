import { StampDef } from '@axe/features/map-editor/assets/stamp-types';

const DEFAULT_COLOR = '#e8e8ea';

interface CacheEntry {
  image: HTMLImageElement;
  decoded: boolean;
  promise: Promise<HTMLImageElement>;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(id: string, size: number, color: string | null): string {
  return `${id}|${size}|${color ?? ''}`;
}

function recolorSvg(svg: string, color: string | null): string {
  const resolved = color ?? DEFAULT_COLOR;
  return svg.split('currentColor').join(resolved);
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function canUseImage(): boolean {
  return typeof Image !== 'undefined';
}

function startDecode(def: StampDef, size: number, color: string | null): CacheEntry | null {
  if (!canUseImage()) return null;
  const image = new Image();
  if (size > 0) {
    image.width = size;
    image.height = size;
  }
  const entry: CacheEntry = {
    image,
    decoded: false,
    promise: new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => {
        entry.decoded = true;
        resolve(image);
      };
      image.onerror = (event) => {
        reject(event instanceof Error ? event : new Error('stamp image decode failed'));
      };
    }),
  };
  try {
    image.src = toDataUri(recolorSvg(def.svg, color));
  } catch (error) {
    entry.promise = Promise.reject(error instanceof Error ? error : new Error('stamp image src failed'));
  }
  return entry;
}

export function getStampImage(def: StampDef, size: number, color: string | null): HTMLImageElement | null {
  const key = cacheKey(def.id, size, color);
  let entry = cache.get(key);
  if (!entry) {
    const created = startDecode(def, size, color);
    if (!created) return null;
    entry = created;
    cache.set(key, entry);
  }
  return entry.decoded ? entry.image : null;
}

export function loadStampImage(def: StampDef, size: number, color: string | null): Promise<HTMLImageElement> {
  const key = cacheKey(def.id, size, color);
  let entry = cache.get(key);
  if (!entry) {
    const created = startDecode(def, size, color);
    if (!created) return Promise.reject(new Error('Image API unavailable'));
    entry = created;
    cache.set(key, entry);
  }
  return entry.promise;
}

export async function warmStampImages(
  items: { stampId: string; size?: number; color: string | null }[],
  defs: StampDef[]
): Promise<void> {
  if (!canUseImage()) return;
  const defById = new Map(defs.map((def) => [def.id, def]));
  const seen = new Set<string>();
  const pending: Promise<unknown>[] = [];
  for (const item of items) {
    const def = defById.get(item.stampId);
    if (!def) continue;
    const size = item.size ?? 1;
    const key = cacheKey(def.id, size, item.color);
    if (seen.has(key)) continue;
    seen.add(key);
    pending.push(loadStampImage(def, size, item.color).catch(() => undefined));
  }
  await Promise.all(pending);
}

export function clearStampImageCache(): void {
  cache.clear();
}
