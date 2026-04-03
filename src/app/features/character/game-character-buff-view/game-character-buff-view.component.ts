import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GameDataElementBuffComponent } from '@axe/features/character/game-data-element-buff/game-data-element-buff.component';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-character-buff-view',
  templateUrl: './game-character-buff-view.component.html',
  styleUrls: ['./game-character-buff-view.component.css'],
  imports: [GameDataElementBuffComponent],
})
export class GameCharacterBuffViewComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);

  //  @Input() title: string = '';

  readonly character = signal<GameCharacter | null>(null);
  readonly isEdit = signal(false);
}
