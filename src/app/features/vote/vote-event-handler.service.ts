import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { FinishVoteEvent } from '@axe/core/event/domain-events';

@Injectable({ providedIn: 'root' })
export class VoteEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly t = inject(TRANSLATE_FN);

  constructor() {
    this.objectChange.finishVote$.subscribe((event) => {
      this.chatMessageService.sendSystemMessageLastSendCharactor(this.resultText(event), event.chatTabIdentifier);
    }, this.destroyRef);
  }

  private resultText(event: FinishVoteEvent): string {
    const parts: string[] = [];
    if (event.isRollCall) {
      parts.push(this.t('feature.vote.rollCallFinish', { voted: event.voted, total: event.total }));
    } else {
      parts.push(this.t('feature.vote.voteFinish', { title: event.voteTitle }));
      for (const tally of event.tally) {
        parts.push(this.t('feature.vote.tallyEntry', { choice: tally.choice, count: tally.count }));
      }
    }
    if (event.abstained > 0) {
      parts.push(this.t('feature.vote.abstainCount', { count: event.abstained }));
    }
    if (event.unanswered > 0) {
      parts.push(this.t('feature.vote.unansweredCount', { count: event.unanswered }));
    }
    return parts.join(' ');
  }
}
