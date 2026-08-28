export const PERF_TERRAIN_GRID_RASTER = 'terrainGridRaster';
export const PERF_VISION_SCENE = 'visionScene';
export const PERF_VISION_MEMO_MISS = 'visionMemoMiss';

class PerfCounters {
  enabled = false;

  private readonly counts = new Map<string, number>();

  bump(key: string): void {
    if (!this.enabled) return;
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  add(key: string, amount: number): void {
    if (!this.enabled) return;
    this.counts.set(key, (this.counts.get(key) ?? 0) + amount);
  }

  drain(): ReadonlyMap<string, number> {
    const taken = new Map(this.counts);
    this.counts.clear();
    return taken;
  }

  clear(): void {
    this.counts.clear();
  }
}

/** What the table does to itself, counted only while somebody is watching. */
export const perfCounters = new PerfCounters();

export function perfTimed<T>(label: string, compute: () => T): T {
  if (!perfCounters.enabled) return compute();
  const started = performance.now();
  const value = compute();
  perfCounters.add(`${label}.ms`, performance.now() - started);
  return value;
}
