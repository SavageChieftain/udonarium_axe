import { Injectable, signal } from '@angular/core';

export interface ChatPaletteHandle {
  setCharacterById(identifier: string): void;
}

@Injectable({ providedIn: 'root' })
export class ChatPaletteRegistryService {
  private readonly handles: ChatPaletteHandle[] = [];
  readonly active = signal<ChatPaletteHandle | null>(null);

  register(handle: ChatPaletteHandle): void {
    if (!this.handles.includes(handle)) this.handles.push(handle);
    this.active.set(handle);
  }

  unregister(handle: ChatPaletteHandle): void {
    const index = this.handles.indexOf(handle);
    if (index >= 0) this.handles.splice(index, 1);
    if (this.active() === handle) this.active.set(this.handles.at(-1) ?? null);
  }
}
