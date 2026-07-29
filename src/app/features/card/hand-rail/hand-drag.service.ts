import { Injectable, signal } from '@angular/core';
import { Card } from '@axe/domain/card/card';

@Injectable({ providedIn: 'root' })
export class HandDragService {
  readonly card = signal<Card | null>(null);
  readonly x = signal(0);
  readonly y = signal(0);
  readonly tableCard = signal<Card | null>(null);

  begin(card: Card, x = 0, y = 0): void {
    this.card.set(card);
    this.x.set(x);
    this.y.set(y);
  }

  move(x: number, y: number): void {
    this.x.set(x);
    this.y.set(y);
  }

  end(): void {
    this.card.set(null);
  }

  armTableDrag(card: Card): void {
    this.tableCard.set(card);
  }

  disarmTableDrag(): void {
    this.tableCard.set(null);
  }
}
