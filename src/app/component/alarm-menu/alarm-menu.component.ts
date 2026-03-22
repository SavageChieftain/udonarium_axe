import { NgClass, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Alarm } from '@axe/alarm';
import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/core/system';
import { PeerCursor } from '@axe/peer-cursor';
import { SafePipe } from 'pipe/safe.pipe';
import { ChatMessageService } from 'service/chat-message.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { SaveDataService } from 'service/save-data.service';

@Component({
  selector: 'app-alarm-menu',
  templateUrl: './alarm-menu.component.html',
  styleUrls: ['./alarm-menu.component.css'],
  imports: [NgTemplateOutlet, NgClass, FormsModule, SafePipe],
})
export class AlarmMenuComponent implements OnInit, OnDestroy, AfterViewInit {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private chatMessageService = inject(ChatMessageService);
  private saveDataService = inject(SaveDataService);
  private objectStore = inject(ObjectStore);

  protected initTimestamp = 0;
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
    this.initTimestamp = Date.now();
  }

  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'アラームタイマ'));
    this.setDefaultCheck();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.setDefaultCheck();
    }, 0);
  }

  isPeerIsDisConnect(peerId: string): boolean {
    return PeerCursor.findByPeerId(peerId) ? PeerCursor.findByPeerId(peerId).isDisConnect : true;
  }

  setDefaultCheck() {
    const list = this.peerList;
    for (const peer of list) {
      const box = <HTMLInputElement>document.getElementById(peer.peerId + '_' + this.initTimestamp);
      if (box) {
        box.checked = !this.isPeerIsDisConnect(peer.peerId);
      }
    }
  }

  selectedNum(): number {
    return this.selectedList().length;
  }

  selectedList(): string[] {
    const list = this.peerList;
    const sendList: string[] = [];
    for (const peer of list) {
      const box = <HTMLInputElement>document.getElementById(peer.peerId + '_' + this.initTimestamp);
      if (box) {
        if (box.checked) {
          sendList.push(peer.peerId);
        }
      }
    }
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

  onChangeType(_name: string) {
    const box = <HTMLInputElement>document.getElementById('rollcall' + '_' + this.initTimestamp);
    this.isRollCall = box.checked;
  }

  voteBlockClick(id: string) {
    const box = <HTMLInputElement>document.getElementById(id + '_' + this.initTimestamp);
    box.checked = !box.checked;
  }

  onChange(id: string) {
    this.voteBlockClick(id);
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

  ngOnDestroy() {
    EventSystem.unregister(this);
  }
}
