import { inject, Injectable } from '@angular/core';
import { CutInService } from '@axe/application/media/cut-in.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { resolveFlipCutIn } from '@axe/domain/card/card-cut-in';
import { CutIn } from '@axe/domain/media/cut-in';

@Injectable({ providedIn: 'root' })
export class CardFlipCutInService {
  private readonly objectStore = inject(ObjectStore);
  private readonly cutInService = inject(CutInService);

  cutIns(): CutIn[] {
    return this.objectStore.getObjects<CutIn>(CutIn);
  }

  /** 1 枚を表にしたときだけ呼ぶ。一括操作では鳴らさない。 */
  playFor(card: Card): boolean {
    const cutIn = resolveFlipCutIn(card, this.cutIns());
    if (!cutIn) return false;
    return this.cutInService.launch(cutIn);
  }

  assign(card: Card, cutInIdentifier: string): void {
    card.cutInIdentifier = cutInIdentifier;
  }
}
