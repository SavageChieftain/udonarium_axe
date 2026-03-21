import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { EventSystem } from '@axe/core/system';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { GameCharacter } from '@axe/game-character';
import { PeerCursor } from '@axe/peer-cursor';
import { ChatTabList } from '@axe/chat-tab-list';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'chat-message-setting',
  templateUrl: './chat-message-setting.component.html',
  styleUrls: ['./chat-message-setting.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class ChatMessageSettingComponent implements OnInit, OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private panelService = inject(PanelService);
  private modalService = inject(ModalService);

  @Input() isAllowedEmpty: boolean = false;
  @Input() tabletopObject: GameCharacter = null!;

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  get chatTabList(): ChatTabList {
    return ObjectStore.instance.get<ChatTabList>('ChatTabList');
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

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnDestroy() {}
}
