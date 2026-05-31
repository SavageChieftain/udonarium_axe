import { inject, Injectable } from '@angular/core';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { isLockable } from '@axe/domain/tabletop/lockable';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export interface MovableLike {
  readonly identifier: string;
  readonly tabletopObject: TabletopObject | undefined;
  posX: number;
  posY: number;
}

interface FollowerSnapshot {
  ref: MovableLike;
  startX: number;
  startY: number;
}

@Injectable({ providedIn: 'root' })
export class MultiMovableService {
  private readonly selectionSignalService = inject(SelectionSignalService);

  private readonly registry = new Map<string, MovableLike>();

  private leaderId: string | null = null;
  private leaderStartX = 0;
  private leaderStartY = 0;
  private followers: FollowerSnapshot[] = [];

  register(ref: MovableLike): void {
    if (!ref.identifier) return;
    this.registry.set(ref.identifier, ref);
  }

  unregister(ref: MovableLike): void {
    if (!ref.identifier) return;
    if (this.registry.get(ref.identifier) === ref) {
      this.registry.delete(ref.identifier);
    }
    if (this.leaderId === ref.identifier) {
      this.clear();
    } else {
      this.followers = this.followers.filter((f) => f.ref.identifier !== ref.identifier);
    }
  }

  beginDrag(leader: MovableLike): boolean {
    const selected = this.selectionSignalService.selectedObjects();
    if (!leader.identifier || !selected.has(leader.identifier)) {
      this.clear();
      return false;
    }
    this.leaderId = leader.identifier;
    this.leaderStartX = leader.posX;
    this.leaderStartY = leader.posY;
    this.followers = [];
    for (const id of selected) {
      if (id === leader.identifier) continue;
      const ref = this.registry.get(id);
      if (!ref) continue;
      if (this.isLocked(ref)) continue;
      this.followers.push({ ref, startX: ref.posX, startY: ref.posY });
    }
    return this.followers.length > 0;
  }

  applyLeaderDelta(leader: MovableLike): void {
    if (this.leaderId !== leader.identifier) return;
    const dx = leader.posX - this.leaderStartX;
    const dy = leader.posY - this.leaderStartY;
    for (const f of this.followers) {
      f.ref.posX = f.startX + dx;
      f.ref.posY = f.startY + dy;
    }
  }

  endDrag(leader: MovableLike): void {
    if (this.leaderId !== leader.identifier) return;
    this.clear();
  }

  followerTabletopObjectsFor(leaderIdentifier: string): readonly TabletopObject[] {
    if (!leaderIdentifier || this.leaderId !== leaderIdentifier) return [];
    const result: TabletopObject[] = [];
    for (const f of this.followers) {
      const obj = f.ref.tabletopObject;
      if (obj) result.push(obj);
    }
    return result;
  }

  private clear(): void {
    this.leaderId = null;
    this.followers = [];
  }

  private isLocked(ref: MovableLike): boolean {
    const obj = ref.tabletopObject;
    if (!obj) return false;
    return isLockable(obj) && obj.isLock;
  }
}
