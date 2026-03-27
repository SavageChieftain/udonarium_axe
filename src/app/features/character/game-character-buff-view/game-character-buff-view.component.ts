import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
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
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  //  @Input() title: string = '';

  character: TabletopObject = null!;
  isEdit: boolean = false;
}
