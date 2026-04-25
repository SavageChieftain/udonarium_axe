import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageFile } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/vote/vote';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vote-window',
  templateUrl: './vote-window.component.html',
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
        margin-left: 20px;
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
export class VoteWindowComponent {
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private timestamp = 0;
  readonly vote = computed(
    () => {
      this.objectChange.versionOf('Vote')();
      const vote = this.objectStore.get<Vote>('Vote')!;
      for (const peerId of vote.targetPeerId) {
        const cursor = PeerCursor.findByPeerId(peerId);
        if (cursor) this.objectChange.versionOf(cursor.identifier)();
      }
      return vote;
    },
    { equal: () => false }
  );
  get answerList(): number[] {
    return this.vote().voteAnswer;
  }

  numberOfVote(index: number): number {
    const list: number[] = this.answerList;
    let count = 0;
    for (const ans of list) {
      if (ans == index) count++;
    }
    return count;
  }

  isMyVoteEnd(): boolean {
    return this.vote().isVoteEnd(PeerCursor.myCursor.peerId);
  }

  voteSend(choice: string) {
    this.vote().voting(choice, PeerCursor.myCursor.peerId);
    let text = this.vote().isRollCall ? '点呼：' : '投票：';
    text += choice + '(' + this.vote().votedTotalNum() + '/' + this.answerList.length + ')';
    this.chatMessageService.sendSystemMessageLastSendCharactor(text);
  }

  constructor() {
    this.timestamp = this.vote().initTimeStamp;
    this.objectChange.endOldVote$.subscribe(() => {
      if (this.timestamp != this.vote().initTimeStamp) {
        this.panelService.close();
      }
    }, this.destroyRef);

    this.objectChange.objectChanged$.subscribe((event) => {
      if (event.identifier !== this.vote().identifier) return;
      if (this.timestamp !== this.vote().initTimeStamp) return;
      if (!this.vote().isFinish) return;
      this.panelService.close();
    }, this.destroyRef);

    this.destroyRef.onDestroy(() => {
      const currentVote = this.objectStore.get<Vote>('Vote');
      if (
        currentVote &&
        !currentVote.isVoteEnd(PeerCursor.myCursor?.peerId ?? '') &&
        this.timestamp == currentVote.initTimeStamp
      ) {
        currentVote.voting(null, PeerCursor.myCursor?.peerId ?? null);
        let text = currentVote.isRollCall ? '点呼：' : '投票：';
        text += '棄権しました' + '(' + currentVote.votedTotalNum() + '/' + currentVote.voteAnswer.length + ')';
        this.chatMessageService.sendSystemMessageLastSendCharactor(text);
      }
    });
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
