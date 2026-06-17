import { DestroyRef } from '@angular/core';

export interface ReadableChannel<T = void> {
  subscribe(listener: (event: T) => void, destroyRef?: DestroyRef): () => void;
}

export class EventChannel<T = void> implements ReadableChannel<T> {
  private readonly _listeners = new Set<(event: T) => void>();

  subscribe(listener: (event: T) => void, destroyRef?: DestroyRef): () => void {
    this._listeners.add(listener);
    const remove = (): void => {
      this._listeners.delete(listener);
    };
    destroyRef?.onDestroy(remove);
    return remove;
  }

  emit(event: T): void {
    const snapshot = [...this._listeners];
    for (const listener of snapshot) {
      if (this._listeners.has(listener)) {
        listener(event);
      }
    }
  }

  get listenerCount(): number {
    return this._listeners.size;
  }
}

/**
 * 最後に emit した値を記憶し、後から subscribe したリスナーにも即座に再配信するチャネル。
 *
 * 「一度きりの状態通知」（例: 設定ロード完了）で、emit が subscribe より先に走っても
 * イベントを取りこぼさないために使う。購読より前に emit 済みなら、subscribe した時点で
 * 直近の値がそのリスナーへ同期的に届く（既存の購読者には通常どおり emit 時に届く）。
 */
export class ReplayEventChannel<T = void> extends EventChannel<T> {
  private hasLastEvent = false;
  private lastEvent!: T;

  override emit(event: T): void {
    this.hasLastEvent = true;
    this.lastEvent = event;
    super.emit(event);
  }

  override subscribe(listener: (event: T) => void, destroyRef?: DestroyRef): () => void {
    const remove = super.subscribe(listener, destroyRef);
    if (this.hasLastEvent) listener(this.lastEvent);
    return remove;
  }
}
