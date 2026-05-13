import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { GameDataElementBuffComponent } from '@axe/features/character/game-data-element-buff/game-data-element-buff.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-buff-view',
  templateUrl: './game-character-buff-view.component.html',
  host: { class: 'block h-full' },
  imports: [GameDataElementBuffComponent],
})
export class GameCharacterBuffViewComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectChange = inject(ObjectChangeService);

  readonly character = signal<GameCharacter | null>(null);
  readonly isEdit = signal(false);

  /** buffDataElement の children 配列をリアクティブに追跡する Signal */
  protected readonly buffChildren = computed<DataElement[]>(() => {
    const char = this.character();
    const buffEl = char?.buffDataElement;
    if (!buffEl) return [];
    this.objectChange.versionOf(buffEl.identifier)();
    return buffEl.children.slice() as DataElement[];
  });

  addBuff() {
    const char = this.character();
    if (!char) return;
    if (!char.buffDataElement) {
      char.addBuffDataElement();
    }
    char.buffDataElement?.appendChild(
      DataElement.create('新しいバフ', 1, { type: DataElementType.NUMBER_RESOURCE, currentValue: '0' })
    );
  }
}
