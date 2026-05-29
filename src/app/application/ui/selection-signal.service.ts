import { computed, Injectable, signal } from '@angular/core';

export interface TabletopObjectSelection {
  identifier: string;
  className: string;
}

export interface TabletopObjectHighlight {
  identifier: string;
  timestamp: number;
}

export interface TabletopCoordinate {
  x: number;
  y: number;
  timestamp: number;
}

export interface MarqueeRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Injectable({
  providedIn: 'root',
})
export class SelectionSignalService {
  readonly selectedObject = signal<TabletopObjectSelection | null>(null);
  readonly highlightedObject = signal<TabletopObjectHighlight | null>(null);
  readonly focusCoordinate = signal<TabletopCoordinate | null>(null);
  readonly cancelTableGestureVersion = signal(0);

  private readonly _selectedObjects = signal<ReadonlySet<string>>(new Set());
  readonly selectedObjects = this._selectedObjects.asReadonly();
  readonly selectionSize = computed(() => this._selectedObjects().size);

  readonly marqueeState = signal<MarqueeRect | null>(null);

  selectObject(identifier: string, className: string): void {
    this.selectedObject.set({ identifier, className });
  }

  highlightObject(identifier: string): void {
    this.highlightedObject.set({ identifier, timestamp: Date.now() });
  }

  focusToCoordinate(x: number, y: number): void {
    this.focusCoordinate.set({ x, y, timestamp: Date.now() });
  }

  cancelTableGesture(): void {
    this.cancelTableGestureVersion.update((v) => v + 1);
  }

  isSelected(identifier: string): boolean {
    return this._selectedObjects().has(identifier);
  }

  addSelection(identifier: string, className?: string): void {
    const current = this._selectedObjects();
    if (current.has(identifier)) return;
    const next = new Set(current);
    next.add(identifier);
    this._selectedObjects.set(next);
    if (className) this.selectObject(identifier, className);
  }

  removeSelection(identifier: string): void {
    const current = this._selectedObjects();
    if (!current.has(identifier)) return;
    const next = new Set(current);
    next.delete(identifier);
    this._selectedObjects.set(next);
  }

  toggleSelection(identifier: string, className?: string): void {
    const current = this._selectedObjects();
    const next = new Set(current);
    if (next.has(identifier)) {
      next.delete(identifier);
    } else {
      next.add(identifier);
      if (className) this.selectObject(identifier, className);
    }
    this._selectedObjects.set(next);
  }

  replaceSelection(ids: Iterable<string>, lastTouched?: TabletopObjectSelection): void {
    this._selectedObjects.set(new Set(ids));
    if (lastTouched) this.selectObject(lastTouched.identifier, lastTouched.className);
  }

  clearSelection(): void {
    if (this._selectedObjects().size === 0) return;
    this._selectedObjects.set(new Set());
  }
}
