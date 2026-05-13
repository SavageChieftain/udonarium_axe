import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/vote/vote';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vote-window',
  templateUrl: './vote-window.component.html',
  imports: [FormsModule, SafePipe],
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

    this.objectChange.onObjectChangedFor(
      // vote は input.required のため未バインド時の参照を避ける。
      () => {
        try {
          return [this.vote().identifier];
        } catch {
          return [];
        }
      },
      () => {
        if (this.timestamp !== this.vote().initTimeStamp) return;
        if (!this.vote().isFinish) return;
        this.panelService.close();
      },
      this.destroyRef
    );

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
