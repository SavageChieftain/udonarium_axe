import { DestroyRef } from '@angular/core';

/** Read-only view of an EventChannel — only allows subscribing, not emitting. */
export interface ReadableChannel<T = void> {
  subscribe(listener: (event: T) => void, destroyRef?: DestroyRef): () => void;
}

/**
 * Lightweight synchronous event bus that replaces RxJS Subject/Observable.
 * - `emit()` calls all registered listeners synchronously.
 * - `subscribe()` returns a cleanup function; if `destroyRef` is provided, cleanup is registered automatically.
 */
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

  /** Number of active listeners (useful in tests). */
  get listenerCount(): number {
    return this._listeners.size;
  }
}
