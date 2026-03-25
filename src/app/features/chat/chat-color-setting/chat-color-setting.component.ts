import { AfterViewInit, ChangeDetectionStrategy, Component, inject, Input, OnDestroy } from '@angular/core';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ModalService } from '@axe/shared/modal.service';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { PanelService } from '@axe/shared/panel.service';

@Component({
  selector: 'chat-color-setting',
  templateUrl: './chat-color-setting.component.html',
  styleUrls: ['./chat-color-setting.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatColorSettingComponent implements OnDestroy, AfterViewInit {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private objectChange = inject(ObjectChangeService);

  @Input() isAllowedEmpty: boolean = false;
  @Input() tabletopObject: GameCharacter = null!;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  changeColor(event: string, num: number) {
    if (this.tabletopObject) {
      this.tabletopObject.chatColorCode[num] = event;

      if (this.tabletopObject.syncDummyCounter < 2) {
        this.tabletopObject.syncDummyCounter = this.tabletopObject.syncDummyCounter + 1;
      } else {
        this.tabletopObject.syncDummyCounter = 0;
      }
    } else {
      this.myPeer.chatColorCode[num] = event;
      this.objectChange.notifyChanged(this.myPeer.identifier);
    }
  }

  constructor() {
    const option = this.modalService.option as Record<string, unknown>;
    this.isAllowedEmpty = option && option.isAllowedEmpty ? true : false;
  }

  chatColorCode(num: number) {
    if (this.tabletopObject) {
      return this.tabletopObject.chatColorCode[num];
    } else {
      return this.myPeer.chatColorCode[num];
    }
  }

  ngAfterViewInit() {}

  ngOnDestroy() {}
}
