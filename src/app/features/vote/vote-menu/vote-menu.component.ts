import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { Network } from '@axe/core/index';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/vote/vote';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vote-menu',
  templateUrl: './vote-menu.component.html',
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class VoteMenuComponent {
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly objectStore = inject(ObjectStore);
  private readonly t = inject(TRANSLATE_FN);

  protected checkedPeers = new Set<string>();
  chatTabidentifier = '';
  networkService = Network;
  voteContentsText = '';
  voteTitle = this.t('feature.vote.voteTitlePlaceholder');
  isRollCall = true;
  includSelf = false;

  get peerList() {
    return this.networkService.peerContexts;
  }
  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }
  get vote(): Vote {
    return this.objectStore.get<Vote>('Vote')!;
  }

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = this.t('feature.vote.panelTitle')));
    this.setDefaultCheck();
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
    const vote = this.vote;
    let voteTitle: string;
    let choicesInput: string = this.voteContentsText.replace(/\s*$/i, '').replace(/^\s*/i, '');
    let startMessage: string;

    if (this.isRollCall) {
      choicesInput = this.t('feature.vote.rollCallReady');
      startMessage = this.t('feature.vote.rollCallStart');
      voteTitle = this.t('feature.vote.rollCall');
    } else {
      choicesInput = choicesInput.length == 0 ? this.t('feature.vote.rollCallDefault') : choicesInput;
      startMessage = this.t('feature.vote.voteStart', { title: this.voteTitle });
      voteTitle = this.voteTitle;
    }
    const choices = choicesInput.split(/\s+/i);
    const peerList = this.selectedList();

    vote.makeVote(PeerCursor.myCursor.peerId, voteTitle, peerList, choices, this.isRollCall, this.chatTabidentifier);
    vote.startVote();
    this.chatMessageService.sendSystemMessageLastSendCharactor(startMessage, this.chatTabidentifier);
    this.panelService.close();
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
    return peerCursor ? peerCursor.image : null;
  }

  findPeerLastControlImage(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.lastControlImage : null;
  }
}
