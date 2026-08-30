import { inject, Injectable, signal } from '@angular/core';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';

@Injectable({ providedIn: 'root' })
export class ChatSpeakerService {
  private readonly objectStore = inject(ObjectStore);
  private readonly held = signal('');

  readonly identifier = this.held.asReadonly();

  /** The chat window reports every time it changes who is speaking. */
  set(identifier: string): void {
    this.held.set(identifier);
  }

  /** Who is speaking, where that is a piece rather than the reader themselves. */
  current(): GameCharacter | null {
    const speaking = this.objectStore.get(this.held());
    return speaking instanceof GameCharacter ? speaking : null;
  }
}
