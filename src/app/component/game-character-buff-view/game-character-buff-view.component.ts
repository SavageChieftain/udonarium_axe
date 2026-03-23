import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { TabletopObject } from '@axe/class/tabletop-object';
import { GameDataElementBuffComponent } from '@axe/component/game-data-element-buff/game-data-element-buff.component';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';

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

  @Input() character: TabletopObject = null!;
  @Input() isEdit: boolean = false;
}
