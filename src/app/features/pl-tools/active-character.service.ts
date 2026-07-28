import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ActiveCharacterService {
  readonly identifier = signal<string | null>(null);

  select(identifier: string): void {
    this.identifier.set(identifier);
  }

  clear(): void {
    this.identifier.set(null);
  }

  toggle(identifier: string): void {
    this.identifier.update((current) => (current === identifier ? null : identifier));
  }

  isActive(identifier: string): boolean {
    return this.identifier() === identifier;
  }
}
