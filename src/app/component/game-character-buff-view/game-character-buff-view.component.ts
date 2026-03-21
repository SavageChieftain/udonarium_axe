import { Component, Input, OnInit, inject } from '@angular/core';

import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

import { TabletopObject } from '@axe/tabletop-object';
import { GameDataElementBuffComponent } from 'component/game-data-element-buff/game-data-element-buff.component';

@Component({
  selector: 'game-character-buff-view',
  templateUrl: './game-character-buff-view.component.html',
  styleUrls: ['./game-character-buff-view.component.css'],
  imports: [GameDataElementBuffComponent],
})
export class GameCharacterBuffViewComponent implements OnInit {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  //  @Input() title: string = '';

  @Input() character: TabletopObject = null!;
  @Input() isEdit: boolean = false;

  ngOnInit() {
    /*
    Promise.resolve().then(() => {
      this.panelService.title = this.title;
      if (this.modalService.option && this.modalService.option.title != null) {
        this.modalService.title = this.modalService.option.title ? this.modalService.option.title : '';
        this.text = this.modalService.option.text ? this.modalService.option.text : '';
      }
    });
*/
  }
}
