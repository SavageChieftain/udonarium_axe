import { Injectable, signal } from '@angular/core';

const DATA_ELEMENT_DRAG_MIME = 'application/x-udonarium-data-element';

@Injectable({ providedIn: 'root' })
export class DataElementDragService {
  private readonly _draggedId = signal<string | null>(null);
  readonly draggedId = this._draggedId.asReadonly();

  start(event: DragEvent, identifier: string): void {
    this._draggedId.set(identifier);
    event.dataTransfer?.setData(DATA_ELEMENT_DRAG_MIME, identifier);
    event.dataTransfer?.setData('text/plain', identifier);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  end(): void {
    this._draggedId.set(null);
  }

  getDraggedId(event?: DragEvent): string | null {
    return (
      this._draggedId() ||
      event?.dataTransfer?.getData(DATA_ELEMENT_DRAG_MIME) ||
      event?.dataTransfer?.getData('text/plain') ||
      null
    );
  }
}
