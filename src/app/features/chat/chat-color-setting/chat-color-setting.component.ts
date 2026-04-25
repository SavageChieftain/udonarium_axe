import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  selector: 'chat-color-setting',
  templateUrl: './chat-color-setting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatColorSettingComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectChange = inject(ObjectChangeService);

  isAllowedEmpty: boolean = false;
  tabletopObject: GameCharacter | null = null;

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
    this.isAllowedEmpty = !!option?.isAllowedEmpty;
  }

  chatColorCode(num: number) {
    if (this.tabletopObject) {
      return this.tabletopObject.chatColorCode[num];
    } else {
      return this.myPeer.chatColorCode[num];
    }
  }

  onChangeColor(event: Event, index: number): void {
    this.changeColor((event.target as HTMLInputElement).value, index);
  }
}
