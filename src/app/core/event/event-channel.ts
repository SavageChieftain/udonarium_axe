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
