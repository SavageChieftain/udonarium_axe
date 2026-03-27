import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { Vote } from '@axe/domain/shared/vote';
import { ChatMessageService } from '@axe/shared/chat/chat-message.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vote-window',
  templateUrl: './vote-window.component.html',
  styleUrls: ['./vote-window.component.css'],
  imports: [NgTemplateOutlet, NgClass, FormsModule, SafePipe],
})
export class VoteWindowComponent implements AfterViewInit, OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private chatMessageService = inject(ChatMessageService);
  private objectStore = inject(ObjectStore);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);
  private timestamp = 0;
  get vote(): Vote {
    return this.objectStore.get<Vote>('Vote');
  }
  get answerList(): number[] {
    return this.vote.voteAnswer;
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
    return this.vote.isVoteEnd(PeerCursor.myCursor.peerId);
  }

  voteSend(choice: string) {
    this.vote.voting(choice, PeerCursor.myCursor.peerId);
    let text = this.vote.isRollCall ? '点呼：' : '投票：';
    text += choice + '(' + this.vote.votedTotalNum() + '/' + this.answerList.length + ')';
    this.chatMessageService.sendSystemMessageLastSendCharactor(text);
  }

  constructor() {
    this.timestamp = this.vote.initTimeStamp;
  }

  ngOnInit() {
    this.objectChange.endOldVote$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.timestamp != this.vote.initTimeStamp) {
        this.panelService.close();
      }
    });

    this.objectChange.objectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.identifier !== this.vote.identifier) return;
      if (this.timestamp !== this.vote.initTimeStamp) return;
      if (!this.vote.isFinish) return;
      this.panelService.close();
    });
  }

  ngAfterViewInit() {}

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
    if (this.vote && !this.isMyVoteEnd() && this.timestamp == this.vote.initTimeStamp) {
      this.vote.voting(null!, PeerCursor.myCursor.peerId);
      let text = this.vote.isRollCall ? '点呼：' : '投票：';
      text += '棄権しました' + '(' + this.vote.votedTotalNum() + '/' + this.answerList.length + ')';
      this.chatMessageService.sendSystemMessageLastSendCharactor(text);
    }
  }
}
