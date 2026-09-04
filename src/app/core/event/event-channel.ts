export interface DestroyHandle {
  onDestroy(callback: () => void): () => void;
}

export interface ReadableChannel<T = void> {
  subscribe(listener: (event: T) => void, destroyRef?: DestroyHandle): () => void;
}

export class EventChannel<T = void> implements ReadableChannel<T> {
  private readonly _listeners = new Set<(event: T) => void>();
  private snapshot: readonly ((event: T) => void)[] = [];

  subscribe(listener: (event: T) => void, destroyRef?: DestroyHandle): () => void {
    this._listeners.add(listener);
    this.snapshot = [...this._listeners];
    const remove = (): void => {
      this._listeners.delete(listener);
      this.snapshot = [...this._listeners];
    };
    destroyRef?.onDestroy(remove);
    return remove;
  }

  emit(event: T): void {
    const snapshot = this.snapshot;
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
 * A channel that remembers its last value and replays it to whoever subscribes later.
 *
 * For a one-off state notice, such as the configuration finishing loading, so that emitting
 * before anyone subscribes loses nothing. Where the value is already there, subscribing
 * delivers it at once; existing listeners still hear it at emit time as usual.
 */
export class StickyEventChannel<T = void> extends EventChannel<T> {
  private hasLastEvent = false;
  private lastEvent!: T;

  override emit(event: T): void {
    this.hasLastEvent = true;
    this.lastEvent = event;
    super.emit(event);
  }

  override subscribe(listener: (event: T) => void, destroyRef?: DestroyHandle): () => void {
    const remove = super.subscribe(listener, destroyRef);
    if (this.hasLastEvent) listener(this.lastEvent);
    return remove;
  }
}
