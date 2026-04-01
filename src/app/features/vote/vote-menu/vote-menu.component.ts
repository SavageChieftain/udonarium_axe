import { NgClass, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/shared/vote';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

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

  protected checkedPeers = new Set<string>();
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

  constructor() {}

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
