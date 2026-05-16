import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Vote } from '@axe/domain/vote/vote';
import { VoteWindowComponent } from '@axe/features/vote/vote-window/vote-window.component';

@Injectable({ providedIn: 'root' })
export class VoteEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly panelService = inject(PanelService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly t = inject(TRANSLATE_FN);

  constructor() {
    this.objectChange.startVote$.subscribe(() => {
      this.openVotePanel();
    }, this.destroyRef);
    this.objectChange.finishVote$.subscribe((event) => {
      this.chatMessageService.sendSystemMessageLastSendCharactor(event.text);
    }, this.destroyRef);
  }

  private openVotePanel(): void {
    const vote = this.objectStore.get<Vote>('Vote');
    if (!vote?.chkToMe()) return;

    const width = 450;
    const height = 400;
    const option: PanelOption = {
      title: this.t('feature.vote.windowTitle'),
      width,
      height,
      left: Math.max(0, (window.innerWidth - width) / 2),
      top: Math.max(0, (window.innerHeight - height) / 2),
    };
    this.panelService.open(VoteWindowComponent, option);
  }
}
