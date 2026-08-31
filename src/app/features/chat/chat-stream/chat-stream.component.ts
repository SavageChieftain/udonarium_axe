import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabComponent } from '@axe/features/chat/chat-tab/chat-tab.component';
import { TranslocoModule } from '@jsverse/transloco';

/**
 * One chat tab's lines going past, and nothing else.
 *
 * The chat window carries a tab strip, an input, colours and settings around whichever tab is
 * open. Somebody who only wants to watch a conversation go by - beside novel mode, or while
 * another tab is being written in - was made to keep all of that on screen, and could only
 * follow one tab at a time. This is a window per tab with none of the furniture.
 *
 * The tab is held as a plain field rather than a signal input because a panel is opened from
 * code, which can only write to a plain field.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-stream',
  templateUrl: './chat-stream.component.html',
  host: { class: 'block h-full' },
  imports: [ChatTabComponent, TranslocoModule],
})
export class ChatStreamComponent {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);

  tabIdentifier = '';

  readonly chatTab = computed<ChatTab | null>(() => {
    this.objectChange.collectionOf(ChatTab.aliasName)();
    return this.objectStore.get<ChatTab>(this.tabIdentifier) ?? null;
  });
}
