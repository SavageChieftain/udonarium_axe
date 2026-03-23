import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatTabList } from '@axe/class/chat-tab-list';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem } from '@axe/class/core/system';
import { GameCharacter } from '@axe/class/game-character';
import { PeerCursor } from '@axe/class/peer-cursor';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';

@Component({
  selector: 'chat-message-setting',
  templateUrl: './chat-message-setting.component.html',
  styleUrls: ['./chat-message-setting.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class ChatMessageSettingComponent implements OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);
  private objectStore = inject(ObjectStore);

  @Input() isAllowedEmpty: boolean = false;
  @Input() tabletopObject: GameCharacter = null!;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList');
  }

  changeDispFlagTime() {
    EventSystem.trigger('RE_DRAW_CHAT', {});
    //中身なし
  }

  changeDispFlagUserId() {
    EventSystem.trigger('RE_DRAW_CHAT', {});
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
