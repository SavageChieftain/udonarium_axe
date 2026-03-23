import { NgClass, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/class/core/system';
import { PeerCursor } from '@axe/class/peer-cursor';
import { Vote } from '@axe/class/vote';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ChatMessageService } from '@axe/service/chat-message.service';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';
import { SaveDataService } from '@axe/service/save-data.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vote-menu',
  templateUrl: './vote-menu.component.html',
  styleUrls: ['./vote-menu.component.css'],
  imports: [NgTemplateOutlet, NgClass, FormsModule, SafePipe],
})
export class VoteMenuComponent implements OnInit, OnDestroy, AfterViewInit {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private chatMessageService = inject(ChatMessageService);
  private saveDataService = inject(SaveDataService);
  private objectStore = inject(ObjectStore);

  protected initTimestamp = 0;
  networkService = Network;
  voteContentsText = '';
  voteTitle = '投票';
  isRollCall = true;
  includSelf = false;

  get peerList() {
    return this.networkService.peerContexts;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get vote(): Vote {
    return this.objectStore.get<Vote>('Vote');
  }

  constructor() {
    this.initTimestamp = Date.now();
  }

  ngOnInit() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = '点呼/投票設定'));
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
    const vote = this.vote;
    let voteTitle: string;
    let choicesInput: string = this.voteContentsText.replace(/\s*$/i, '').replace(/^\s*/i, '');
    let startMessage: string;

    if (this.isRollCall) {
      choicesInput = '準備完了';
      startMessage = '点呼開始！';
      voteTitle = '点呼';
    } else {
      choicesInput = choicesInput.length == 0 ? '賛成 反対' : choicesInput;
      startMessage = '投票開始！(' + this.voteTitle + ')';
      voteTitle = this.voteTitle;
    }
    const choices = choicesInput.split(/\s+/i);
    const peerList = this.selectedList();

    vote.makeVote(PeerCursor.myCursor.peerId, voteTitle, peerList, choices, this.isRollCall);
    vote.startVote();
    this.chatMessageService.sendSystemMessageLastSendCharactor(startMessage);
    this.panelService.close();
  }

  changeIncludSelf() {
    // 処理なし
  }

  onChangeType(_name?: string) {
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
