import { Injectable, signal } from '@angular/core';

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

@Injectable({
  providedIn: 'root',
})
export class SelectionSignalService {
  readonly selectedObject = signal<TabletopObjectSelection | null>(null);
  readonly highlightedObject = signal<TabletopObjectHighlight | null>(null);
  readonly focusCoordinate = signal<TabletopCoordinate | null>(null);
  readonly dragLockedVersion = signal(0);

  selectObject(identifier: string, className: string): void {
    this.selectedObject.set({ identifier, className });
  }

  highlightObject(identifier: string): void {
    this.highlightedObject.set({ identifier, timestamp: Date.now() });
  }

  focusToCoordinate(x: number, y: number): void {
    this.focusCoordinate.set({ x, y, timestamp: Date.now() });
  }

  notifyDragLocked(): void {
    this.dragLockedVersion.update((v) => v + 1);
  }
}
