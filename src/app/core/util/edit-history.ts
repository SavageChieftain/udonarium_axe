/**
 * What an editor can take back and put again.
 *
 * The stack holds copies rather than the thing being edited, so what is handed back is
 * never the same object the editor went on to change. How a copy is made is left to
 * whoever builds one, since only they know what the value is.
 */
export class EditHistory<T> {
  private readonly clone: (value: T) => T;
  private readonly limit: number;
  private undoStack: T[];
  private redoStack: T[] = [];

  constructor(initial: T, clone: (value: T) => T, limit = 50) {
    this.clone = clone;
    this.limit = limit;
    this.undoStack = [clone(initial)];
  }

  commit(value: T): void {
    this.undoStack.push(this.clone(value));
    this.redoStack = [];
    while (this.undoStack.length > this.limit + 1) {
      this.undoStack.shift();
    }
  }

  undo(): T | null {
    if (this.undoStack.length <= 1) return null;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    return this.clone(this.undoStack[this.undoStack.length - 1]);
  }

  redo(): T | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    return this.clone(next);
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  reset(value: T): void {
    this.undoStack = [this.clone(value)];
    this.redoStack = [];
  }
}
