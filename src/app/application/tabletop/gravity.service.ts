import { DestroyRef, inject, Injectable } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopOverlapRegistryEntry, TabletopOverlapService } from '@axe/application/ui/tabletop-overlap.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { surfaceOf, TableSurface, TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';

const GRID_PX = 50;
const POSZ_EPSILON = 0.5;
const DEBOUNCE_MS = 80;
const MAX_PASSES = 8;
const BUCKET_PX = 4 * GRID_PX;

const GRAVITY_ALIASES = ['terrain', 'character', 'table-mask', 'table-scratch-mask', 'text-note'] as const;

interface CachedEntry {
  entry: TabletopOverlapRegistryEntry;
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  altitudePx: number;
  heightPx: number;
  posZ: number;
  topZ: number;
  isGravity: boolean;
}

@Injectable({ providedIn: 'root' })
export class GravityService {
  private readonly overlapService = inject(TabletopOverlapService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly destroyRef = inject(DestroyRef);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private applying = false;

  constructor() {
    for (const alias of GRAVITY_ALIASES) {
      this.objectChange.onObjectChangedForSingleAlias(alias, () => this.schedule(), this.destroyRef);
    }
    this.destroyRef.onDestroy(() => {
      if (this.timer != null) clearTimeout(this.timer);
      this.timer = null;
    });
  }

  private schedule(): void {
    if (this.applying) return;
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.pointerDeviceService.isDragging) {
        this.schedule();
        return;
      }
      this.apply();
    }, DEBOUNCE_MS);
  }

  private apply(): void {
    this.applying = true;
    try {
      const entries = this.overlapService.entries().filter((e) => surfaceOf(e.object) === 'floor');
      if (entries.length === 0) return;

      // Footprint と Z を一度だけ読み出し、以降の inner loop で reflow を起こさないキャッシュにする
      const cached = GravityService.buildCache(entries);
      const hasGravityTarget = cached.some((c) => c.isGravity);
      if (!hasGravityTarget) return;

      // 各オブジェクトを所属セルに登録。findSupportZ は対象中心のセルだけを走査すれば足りる
      const grid = GravityService.buildSpatialIndex(cached);

      for (let pass = 0; pass < MAX_PASSES; pass++) {
        let changed = false;
        for (const c of cached) {
          if (!c.isGravity) continue;
          const support = GravityService.findSupportZAtCenter(c, grid);
          if (Math.abs(c.posZ - support) > POSZ_EPSILON) {
            c.entry.object.posZ = support;
            c.posZ = support;
            c.topZ = c.altitudePx + support + c.heightPx;
            changed = true;
          }
        }
        if (!changed) break;
      }
    } finally {
      // posZ 変更で起きる markForChanged の microtask が schedule() を呼び戻す前に
      // applying フラグを落とすと、自分が起こした settling で次の apply が即連鎖する。
      // microtask に乗せることで gravity 由来の再 schedule を吸収する。
      queueMicrotask(() => {
        this.applying = false;
      });
    }
  }

  static isAffectedByGravity(obj: TabletopObject): boolean {
    return obj instanceof Terrain || obj instanceof GameCharacter;
  }

  static findSupportZ(target: TabletopOverlapRegistryEntry, entries: TabletopOverlapRegistryEntry[]): number {
    const center = GravityService.footprintCenter(target);
    const targetBottom = target.object.altitude * GRID_PX + target.object.posZ;
    let maxZ = 0;
    for (const entry of entries) {
      if (entry.object.identifier === target.object.identifier) continue;
      if (!GravityService.containsPoint(entry, center.x, center.y)) continue;
      const topZ = GravityService.topZ(entry.object);
      if (topZ > targetBottom + POSZ_EPSILON) continue;
      if (topZ > maxZ) maxZ = topZ;
    }
    return maxZ;
  }

  static topZ(obj: TabletopObject): number {
    const baseZ = obj.altitude * GRID_PX + obj.posZ;
    if (obj instanceof Terrain) return baseZ + obj.height * GRID_PX;
    return baseZ;
  }

  static contactTopZ(obj: TabletopObject, surface: TableSurface): number {
    if (surface === 'floor') return GravityService.topZ(obj);
    const heightPx = obj instanceof Terrain ? obj.height * GRID_PX : 0;
    return obj.posZ + heightPx;
  }

  private static footprintCenter(entry: TabletopOverlapRegistryEntry): { x: number; y: number } {
    const w = entry.element.offsetWidth;
    const h = entry.element.offsetHeight;
    return { x: entry.object.location.x + w / 2, y: entry.object.location.y + h / 2 };
  }

  private static containsPoint(entry: TabletopOverlapRegistryEntry, x: number, y: number): boolean {
    const left = entry.object.location.x;
    const top = entry.object.location.y;
    const right = left + entry.element.offsetWidth;
    const bottom = top + entry.element.offsetHeight;
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  private static buildCache(entries: TabletopOverlapRegistryEntry[]): CachedEntry[] {
    const cached: CachedEntry[] = [];
    for (const entry of entries) {
      const w = entry.element.offsetWidth;
      const h = entry.element.offsetHeight;
      const left = entry.object.location.x;
      const top = entry.object.location.y;
      const altitudePx = entry.object.altitude * GRID_PX;
      const posZ = entry.object.posZ;
      const heightPx = entry.object instanceof Terrain ? entry.object.height * GRID_PX : 0;
      cached.push({
        entry,
        left,
        top,
        right: left + w,
        bottom: top + h,
        centerX: left + w / 2,
        centerY: top + h / 2,
        altitudePx,
        heightPx,
        posZ,
        topZ: altitudePx + posZ + heightPx,
        isGravity: GravityService.isAffectedByGravity(entry.object),
      });
    }
    return cached;
  }

  private static buildSpatialIndex(cached: CachedEntry[]): Map<string, CachedEntry[]> {
    const grid = new Map<string, CachedEntry[]>();
    for (const c of cached) {
      const minCellX = Math.floor(c.left / BUCKET_PX);
      const maxCellX = Math.floor(c.right / BUCKET_PX);
      const minCellY = Math.floor(c.top / BUCKET_PX);
      const maxCellY = Math.floor(c.bottom / BUCKET_PX);
      for (let cx = minCellX; cx <= maxCellX; cx++) {
        for (let cy = minCellY; cy <= maxCellY; cy++) {
          const key = `${cx},${cy}`;
          let bucket = grid.get(key);
          if (!bucket) {
            bucket = [];
            grid.set(key, bucket);
          }
          bucket.push(c);
        }
      }
    }
    return grid;
  }

  private static findSupportZAtCenter(target: CachedEntry, grid: Map<string, CachedEntry[]>): number {
    const cellX = Math.floor(target.centerX / BUCKET_PX);
    const cellY = Math.floor(target.centerY / BUCKET_PX);
    const bucket = grid.get(`${cellX},${cellY}`);
    if (!bucket) return 0;

    const targetBottom = target.altitudePx + target.posZ;
    const targetId = target.entry.object.identifier;
    const cx = target.centerX;
    const cy = target.centerY;

    let maxZ = 0;
    for (const c of bucket) {
      if (c.entry.object.identifier === targetId) continue;
      if (cx < c.left || cx > c.right) continue;
      if (cy < c.top || cy > c.bottom) continue;
      if (c.topZ > targetBottom + POSZ_EPSILON) continue;
      if (c.topZ > maxZ) maxZ = c.topZ;
    }
    return maxZ;
  }
}
