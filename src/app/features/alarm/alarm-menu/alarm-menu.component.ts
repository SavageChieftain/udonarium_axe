import { NgClass, NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { SaveDataService } from '@axe/core/save-data.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Alarm } from '@axe/domain/shared/alarm';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-alarm-menu',
  templateUrl: './alarm-menu.component.html',
  styleUrls: ['./alarm-menu.component.css'],
  imports: [NgTemplateOutlet, NgClass, FormsModule, SafePipe],
})
export class AlarmMenuComponent implements OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private chatMessageService = inject(ChatMessageService);
  private saveDataService = inject(SaveDataService);
  private objectStore = inject(ObjectStore);

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
    return this.objectStore.get<Alarm>('Alarm');
  }

  constructor() {
    afterNextRender(() => {
      this.setDefaultCheck();
    });
  }

  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'アラームタイマ'));
    this.setDefaultCheck();
  }

  isPeerIsDisConnect(peerId: string): boolean {
    return PeerCursor.findByPeerId(peerId) ? PeerCursor.findByPeerId(peerId).isDisConnect : true;
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

  findPeerImage(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.image : null!;
  }

  findPeerLastControlImage(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.lastControlImage : null!;
  }

  ngOnDestroy() {}
}
