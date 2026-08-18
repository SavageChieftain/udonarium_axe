import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatSettingsEventHandlerService } from '@axe/features/chat/chat-settings-event-handler.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'chat-color-setting',
  templateUrl: './chat-color-setting.component.html',
  host: { class: 'block px-3 py-[10px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoModule],
})
export class ChatColorSettingComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatSettings = inject(ChatSettingsEventHandlerService);

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
      this.chatSettings.captureColors();
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
