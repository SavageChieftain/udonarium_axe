import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  selector: 'chat-message-setting',
  templateUrl: './chat-message-setting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class ChatMessageSettingComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly uiSignalService = inject(UiSignalService);

  isAllowedEmpty: boolean = false;
  tabletopObject: GameCharacter | null = null;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  changeDispFlagTime() {
    this.uiSignalService.notifyChatRedraw();
    //中身なし
  }

  changeDispFlagUserId() {
    this.uiSignalService.notifyChatRedraw();
    //中身なし
  }

  changePortraitInWindow() {
    //中身なし
  }

  changeKeepPortraitOutWindow() {
    //中身なし
  }
}
