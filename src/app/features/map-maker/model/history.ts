import { cloneScene, MapScene } from '@axe/features/map-maker/model/scene';

export class SceneHistory {
  private undoStack: MapScene[];
  private redoStack: MapScene[] = [];
  private readonly limit: number;

  constructor(initial: MapScene, limit = 50) {
    this.limit = limit;
    this.undoStack = [cloneScene(initial)];
  }

  commit(scene: MapScene): void {
    this.undoStack.push(cloneScene(scene));
    this.redoStack = [];
    while (this.undoStack.length > this.limit + 1) {
      this.undoStack.shift();
    }
  }

  undo(): MapScene | null {
    if (this.undoStack.length <= 1) return null;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    return cloneScene(this.undoStack[this.undoStack.length - 1]);
  }

  redo(): MapScene | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    return cloneScene(next);
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  reset(scene: MapScene): void {
    this.undoStack = [cloneScene(scene)];
    this.redoStack = [];
  }
}
