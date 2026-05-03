import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';

@SyncObject('playlist')
export class Playlist extends GameObject {
  /** 再生リスト（BGM audioIdentifier の順序付きリスト） */
  @SyncVar() entries: string[] = [];

  static get instance(): Playlist | null {
    return ObjectStore.instance.get<Playlist>('Playlist') ?? null;
  }

  addEntry(identifier: string): void {
    if (!this.entries.includes(identifier)) {
      this.entries = [...this.entries, identifier];
    }
  }

  removeEntry(identifier: string): void {
    this.entries = this.entries.filter((id) => id !== identifier);
  }

  moveEntry(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    const next = [...this.entries];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    this.entries = next;
  }

  hasEntry(identifier: string): boolean {
    return this.entries.includes(identifier);
  }
}
