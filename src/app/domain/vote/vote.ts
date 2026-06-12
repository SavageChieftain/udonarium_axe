import { emitEndOldVote, emitFinishVote, emitStartVote } from '@axe/core/event/domain-events';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

export interface VoteContext {
  peerId: string;
}

@SyncObject('Vote')
export class Vote extends GameObject {
  @SyncVar() initTimeStamp = 0;
  @SyncVar() voteTitle = '';
  //  @SyncVar() voteAnswer: VoteContext[] = [];

  @SyncVar() targetPeerId: string[] = [];

  //  @SyncVar() lastVotePeerId = '';
  @SyncVar() choices: string[] = [];
  @SyncVar() chairId = '';
  @SyncVar() isRollCall = false;
  @SyncVar() isFinish = false;
  @SyncVar() voteId = 0;

  voteAnswerByPeerId(peerId: string): number {
    const peer = PeerCursor.findByPeerId(peerId);
    if (peer) {
      if (peer.voteId == this.voteId) {
        return peer.voteAnswer;
      }
      if (peer.isDisConnect) {
        return -2;
      }
      return -1;
    } else {
      return -2; // 棄権扱いにする
    }
  }

  get voteAnswer(): number[] {
    const answer: number[] = [];

    for (const peerId of this.targetPeerId) {
      answer.push(this.voteAnswerByPeerId(peerId));
    }
    return answer;
  }

  makeVote(chairId: string, voteTitle: string, targetPeerId: string[], choices: string[], isRollCall: boolean) {
    this.isRollCall = isRollCall;
    this.chairId = chairId;
    this.choices = choices;
    this.voteTitle = voteTitle;
    this.isFinish = false;
    this.voteId++;

    this.targetPeerId = targetPeerId;
    this.initTimeStamp = Date.now();
  }

  isVoteEnd(peerId: string): boolean {
    for (const targetPeer of this.targetPeerId) {
      if (targetPeer == peerId) {
        const peer = PeerCursor.findByPeerId(peerId);
        if (!peer) return true;
        if (peer.voteId == this.voteId) return true;
      }
    }
    return false;
  }

  voting(choice: string | null, _peerId: string) {
    if (choice) {
      PeerCursor.myCursor.voteAnswer = this.choices.indexOf(choice);
    } else {
      PeerCursor.myCursor.voteAnswer = -2;
    }
    PeerCursor.myCursor.voteId = this.voteId;

    this.chkFinishVote();
  }

  chkFinishVote() {
    if (this.isFinish) return;
    if (this.chairId == PeerCursor.myCursor?.peerId && this.votedTotalNum() == this.targetPeerId.length) {
      this.isFinish = true;
      let text_: string;
      if (this.isRollCall) {
        text_ = `点呼終了(${this.votedTotalNum()}/${this.targetPeerId.length})`;
        if (this.votedNumByIndex(-2) != 0) {
          text_ += ` 棄権：${this.votedNumByIndex(-2)}`;
        }
      } else {
        text_ = `投票終了(${this.voteTitle}) `;
        for (const cho of this.choices) {
          text_ += ` ${cho}：${this.votedNumByChoice(cho)}`;
        }
        if (this.votedNumByIndex(-2) != 0) {
          text_ += ` 棄権：${this.votedNumByIndex(-2)}`;
        }
      }
      setTimeout(() => {
        emitFinishVote({ text: text_ });
      }, 1);
    }
  }

  votedTotalNum(): number {
    const answer: number[] = this.voteAnswer;
    let count = 0;
    for (const ans of answer) {
      if (ans >= 0 || ans == -2) {
        count++;
      }
    }
    return count;
  }

  votedNumByIndex(index: number): number {
    const answer: number[] = this.voteAnswer;
    let count = 0;
    for (const ans of answer) {
      if (ans == index) {
        count++;
      }
    }
    return count;
  }

  votedNumByChoice(choice: string): number {
    const index = this.choices.indexOf(choice);
    return this.votedNumByIndex(index);
  }

  indexToChoice(index: number): string {
    if (index < 0) return '';
    if (index >= this.choices.length) return '';
    return this.choices[index];
  }

  chkToMe(): boolean {
    for (const target of this.targetPeerId) {
      if (PeerCursor.myCursor.peerId == target) return true;
    }
    return false;
  }

  startVote() {
    emitEndOldVote();
    emitStartVote();
  }

  override apply(context: ObjectContext) {
    const initTimeStamp = this.initTimeStamp;
    super.apply(context);

    if (initTimeStamp !== this.initTimeStamp) {
      this.startVote();
    }

    this.chkFinishVote();
  }
}
