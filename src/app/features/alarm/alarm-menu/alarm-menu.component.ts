import { NgClass, NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { ImageFile } from '@axe/core/storage/image-file';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Alarm } from '@axe/domain/alarm/alarm';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-alarm-menu',
  templateUrl: './alarm-menu.component.html',
  styles: [
    `
      .component {
        width: 100%;
      }

      .box {
        border: transparent 2px solid;
        border-left: transparent 6px solid;
        margin-top: 2px;
        padding: 2px;
        padding-bottom: 3px;
        box-sizing: border-box;

        border: 1px dotted #666;
      }

      .message {
        width: 100%;
        height: 100%;
        display: flex;
        vertical-align: middle;
      }

      .selected {
        padding: 2px;
        border: 2px dotted #666;
        border-left: 6px solid #444;
      }

      .hidden-spacer {
        visibility: hidden;
        height: 0;
        font-size: 1em;
        min-width: 1em;
        max-width: 12em;
        overflow: hidden;
        padding: 0 2px;
        box-sizing: border-box;
        white-space: nowrap;
      }

      .tab {
        padding: 5px;
        user-select: none;
      }

      .tab {
        padding: 0px;
        border: solid 1px #555;
        border-radius: 0.3em;
        overflow: hidden;

        flex-flow: row nowrap;
        justify-content: space-around;
        align-items: stretch;

        text-align: center;

        margin: 0px;

        background-color: rgba(240, 218, 189, 0.9);
      }

      .tab input[type='radio'] {
        vertical-align: middle;
        outline: 0;
        font-size: 0.6em;
        background-color: transparent;
        color: #444;

        box-sizing: border-box;
        margin-left: 10px;
        margin-top: -3px;
        cursor: pointer;
      }

      .tab input[type='radio'] + div:hover {
        background-color: #888;
        color: #eee;
        border-color: #555;
      }

      .tab input[type='radio']:checked + div {
        background: #555;
        color: #ccc;
      }

      .is-sticky-top {
        position: sticky;
        top: 0;
      }

      .small-font {
        font-size: 12px;
        vertical-align: middle;
      }

      .material-icons {
        vertical-align: middle;
        font-size: 1rem;
      }

      .table-cell {
        display: table-cell;
      }

      .image-box {
        padding: 0px;
        width: 64px;
        height: 64px;
        max-width: 64px;
        max-height: 64px;
        vertical-align: top;
      }

      .image-box img {
        width: 100%;
        height: 100%;
        vertical-align: bottom;
        object-fit: cover;
        object-position: 50% 0%;
      }

      .image {
        padding: 0px;
        width: 64px;
        height: 64px;
        display: table-cell;
        vertical-align: top;
      }

      .cover {
        background-position: center top;
        background-repeat: no-repeat;
        background-size: cover;
      }

      .image-cover {
        width: 100%;
        height: 100%;
      }

      .inventory-object {
        font-size: 14px;
        display: inline-block;
        vertical-align: text-top;
      }

      .object-name {
        font-size: 0.8em;
        font-weight: bold;
        padding: 0 0.25em;
        width: 120px;
        overflow: hidden;
        white-space: nowrap;
      }

      .object-tags-box {
        display: table;
        table-layout: fixed;
      }

      .object-tag {
        display: inline-block;
        padding: 0 0.25em;
        vertical-align: middle;
      }
    `,
  ],
  imports: [NgTemplateOutlet, NgClass, FormsModule, SafePipe],
})
export class AlarmMenuComponent {
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly objectStore = inject(ObjectStore);

  protected checkedPeers = new Set<string>();
  networkService = Network;
  voteContentsText = '';
  alarmTitle = 'タイマ';
  alarmTime = 60;
  isRollCall = true;
  includSelf = true;
  isSound = true;
  isPopUp = true;

  get peerList() {
    return this.networkService.peerContexts;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get alarm(): Alarm {
    return this.objectStore.get<Alarm>('Alarm')!;
  }

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'アラームタイマ'));
    afterNextRender(() => {
      this.setDefaultCheck();
    });
  }

  isPeerIsDisConnect(peerId: string): boolean {
    const cursor = PeerCursor.findByPeerId(peerId);
    return cursor ? cursor.isDisConnect : true;
  }

  setDefaultCheck() {
    this.checkedPeers.clear();
    for (const peer of this.peerList) {
      if (!this.isPeerIsDisConnect(peer.peerId)) {
        this.checkedPeers.add(peer.peerId);
      }
    }
  }

  selectedNum(): number {
    return this.selectedList().length;
  }

  selectedList(): string[] {
    const sendList = [...this.checkedPeers];
    if (this.includSelf) {
      sendList.push(this.myPeer.peerId);
    }
    return sendList;
  }

  send() {
    this.changeAlarmTime();

    const alarm = this.alarm;
    const alarmTitle = this.alarmTitle;
    let startMessage: string;
    let target: string;
    const peerIdList = this.selectedList();

    startMessage = 'アラームセット ' + this.alarmTime + '秒';

    if (this.peerList.length + 1 == this.selectedNum()) {
      target = ' >全員 ';
    } else {
      target = ' >';
      for (const peerId of peerIdList) {
        target += this.findPeerName(peerId) + ' ';
      }
    }
    startMessage += target;

    alarm.makeAlarm(this.alarmTime, alarmTitle, peerIdList, this.myPeer.peerId, target, this.isSound, this.isPopUp);
    this.chatMessageService.sendSystemMessageLastSendCharactor(startMessage);
    alarm.startAlarm();
    this.panelService.close();
  }

  changeAlarmTime() {
    if (this.alarmTime <= 0) this.alarmTime = 0;
    if (this.alarmTime >= 3600) this.alarmTime = 3600;
  }

  changeIncludSelf() {
    // 処理なし
  }

  changeIsSound() {
    // 処理なし
  }

  changeIsPopUp() {
    // 処理なし
  }

  onChangeType(value: string) {
    this.isRollCall = value === 'rollcall';
  }

  voteBlockClick(id: string) {
    if (this.checkedPeers.has(id)) {
      this.checkedPeers.delete(id);
    } else {
      this.checkedPeers.add(id);
    }
  }

  findUserId(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.userId : '';
  }

  findPeerName(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.name : '';
  }

  findPeerLastControlName(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.lastControlCharacterName : '';
  }

  findPeerImage(peerId: string): ImageFile | null {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.image : null;
  }

  findPeerLastControlImage(peerId: string): ImageFile | null {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.lastControlImage : null;
  }
}
