import { Injectable, signal } from '@angular/core';
import { GameCharacter } from '@axe/domain/character/game-character';

@Injectable({ providedIn: 'root' })
export class NpcDragService {
  readonly character = signal<GameCharacter | null>(null);
  readonly x = signal(0);
  readonly y = signal(0);

  begin(character: GameCharacter, x = 0, y = 0): void {
    this.character.set(character);
    this.x.set(x);
    this.y.set(y);
  }

  move(x: number, y: number): void {
    this.x.set(x);
    this.y.set(y);
  }

  end(register: boolean): void {
    const character = this.character();
    if (register && character && !character.isNpc) {
      character.isNpc = true;
      character.update();
    }
    this.character.set(null);
  }
}
