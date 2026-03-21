import { AfterViewInit, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

import { ObjectStore } from '@axe/core/synchronize-object/object-store';

import { EventSystem } from '@axe/core/system';
import { PeerCursor } from '@axe/peer-cursor';

import { ChatMessageService } from 'service/chat-message.service';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';

import { Vote } from '@axe/vote';
import { NgTemplateOutlet, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafePipe } from 'pipe/safe.pipe';

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

  private timestamp = 0;
  get vote(): Vote {
    return ObjectStore.instance.get<Vote>('Vote');
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
      console.log('古い投票を終了');
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
