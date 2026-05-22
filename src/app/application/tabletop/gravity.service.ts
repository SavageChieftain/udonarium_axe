import { DestroyRef, inject, Injectable } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopOverlapRegistryEntry, TabletopOverlapService } from '@axe/application/ui/tabletop-overlap.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';

const GRID_PX = 50;
const POSZ_EPSILON = 0.5;

const GRAVITY_ALIASES = ['terrain', 'character', 'table-mask', 'table-scratch-mask', 'text-note'] as const;

@Injectable({ providedIn: 'root' })
export class GravityService {
  private readonly overlapService = inject(TabletopOverlapService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  private pending = false;

  constructor() {
    this.objectChange.onObjectChangedForAlias(
      GRAVITY_ALIASES as unknown as readonly string[],
      () => this.schedule(),
      this.destroyRef
    );
  }

  private schedule(): void {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      this.apply();
    });
  }

  private apply(): void {
    for (const entry of this.overlapService.entries()) {
      if (!GravityService.isAffectedByGravity(entry.object)) continue;
      const support = GravityService.findSupportZ(entry, this.overlapService.entries());
      if (Math.abs(entry.object.posZ - support) > POSZ_EPSILON) {
        entry.object.posZ = support;
      }
    }
  }

  static isAffectedByGravity(obj: TabletopObject): boolean {
    return obj instanceof Terrain || obj instanceof GameCharacter;
  }

  static findSupportZ(target: TabletopOverlapRegistryEntry, entries: TabletopOverlapRegistryEntry[]): number {
    const center = GravityService.footprintCenter(target);
    let maxZ = 0;
    for (const entry of entries) {
      if (entry.object.identifier === target.object.identifier) continue;
      if (!GravityService.containsPoint(entry, center.x, center.y)) continue;
      const topZ = GravityService.topZ(entry.object);
      if (topZ > maxZ) maxZ = topZ;
    }
    return maxZ;
  }

  static topZ(obj: TabletopObject): number {
    const baseZ = obj.altitude * GRID_PX + obj.posZ;
    if (obj instanceof Terrain) return baseZ + obj.height * GRID_PX;
    return baseZ;
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
}
