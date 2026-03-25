import { AfterViewInit, ChangeDetectionStrategy, Component, inject, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ModalService } from '@axe/shared/modal.service';
import { PanelService } from '@axe/shared/panel.service';
import { UiSignalService } from '@axe/shared/ui-signal.service';

@Component({
  selector: 'chat-message-setting',
  templateUrl: './chat-message-setting.component.html',
  styleUrls: ['./chat-message-setting.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class ChatMessageSettingComponent implements OnDestroy, AfterViewInit {
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private objectStore = inject(ObjectStore);
  private uiSignalService = inject(UiSignalService);

  @Input() isAllowedEmpty: boolean = false;
  @Input() tabletopObject: GameCharacter = null!;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList');
  }

  changeDispFlagTime() {
    this.uiSignalService.notifyChatRedraw();
    //中身なし
  }

  changeDispFlagUserId() {
    this.uiSignalService.notifyChatRedraw();
    //中身なし
  }

  changeTachieInWindow() {
    //中身なし
  }

  changeKeepTachieOutWindow() {
    //中身なし
  }

  ngAfterViewInit() {}

  ngOnDestroy() {}
}
