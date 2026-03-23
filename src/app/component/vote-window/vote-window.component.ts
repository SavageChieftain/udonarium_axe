import { NgClass, NgTemplateOutlet } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem } from '@axe/class/core/system';
import { PeerCursor } from '@axe/class/peer-cursor';
import { Vote } from '@axe/class/vote';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ChatMessageService } from '@axe/service/chat-message.service';
import { ModalService } from '@axe/service/modal.service';
import { PanelService } from '@axe/service/panel.service';

@Component({
  selector: 'app-vote-window',
  templateUrl: './vote-window.component.html',
  styleUrls: ['./vote-window.component.css'],
  imports: [NgTemplateOutlet, NgClass, FormsModule, SafePipe],
})
export class VoteWindowComponent implements AfterViewInit, OnInit, OnDestroy {
  private modalService = inject(ModalService);
  private panelService = inject(PanelService);
  private changeDetectionRef = inject(ChangeDetectorRef);
  private chatMessageService = inject(ChatMessageService);
  private ngZone = inject(NgZone);
  private objectStore = inject(ObjectStore);

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
    EventSystem.register(this).on('END_OLD_VOTE', (_event) => {
      if (this.timestamp != this.vote.initTimeStamp) {
        this.panelService.close();
      }
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

    EventSystem.unregister(this);
  }
}
