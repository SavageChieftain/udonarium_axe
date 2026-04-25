import { NgClass, NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Network } from '@axe/core/index';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/vote/vote';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vote-menu',
  templateUrl: './vote-menu.component.html',
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
export class VoteMenuComponent {
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly objectStore = inject(ObjectStore);

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
    return this.objectStore.get<Vote>('Vote')!;
  }

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = '点呼/投票設定'));
    this.setDefaultCheck();
    afterNextRender(() => this.setDefaultCheck());
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
    return peerCursor ? peerCursor.image : null;
  }

  findPeerLastControlImage(peerId: string) {
    const peerCursor = PeerCursor.findByPeerId(peerId);
    return peerCursor ? peerCursor.lastControlImage : null;
  }
}
