import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VisualNovelModeService {
  private readonly _active = signal(false);
  readonly active = this._active.asReadonly();

  activate(): void {
    this._active.set(true);
  }

  deactivate(): void {
    this._active.set(false);
  }

  toggle(): void {
    this._active.update((active) => !active);
  }
}
