import { inject, Injectable, signal } from '@angular/core';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';

/**
 * The chat tab being read.
 *
 * Something thrown on the table belongs to no tab as far as the table is concerned. The
 * reader is looking at their own tab, though, so that is where the result goes.
 */
@Injectable({ providedIn: 'root' })
export class ActiveChatTabService {
  private readonly objectStore = inject(ObjectStore);
  private readonly identifier = signal('');

  /** The chat window reports every time it changes tab. */
  set(identifier: string): void {
    this.identifier.set(identifier);
  }

  /**
   * The tab being read. Null with no window open yet, or once that tab is gone.
   *
   * Nowhere is not quietly filled in with another tab. The caller decides what suits
   * the moment.
   */
  current(): ChatTab | null {
    const tab = this.objectStore.get<ChatTab>(this.identifier());
    return tab instanceof ChatTab ? tab : null;
  }
}
