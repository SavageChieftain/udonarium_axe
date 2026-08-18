import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChatPreferencesService } from '@axe/application/chat/chat-preferences.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@Injectable({ providedIn: 'root' })
export class ChatSettingsEventHandlerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatTabList = inject(ChatTabList);
  private readonly preferences = inject(ChatPreferencesService);

  constructor() {
    this.restoreColors();
    this.restoreDisplay();
    for (const tab of this.chatTabList.chatTabs) this.restoreTab(tab);

    this.objectChange.objectAdded$.subscribe((event) => {
      if (event.aliasName !== 'chat-tab') return;
      const tab = this.objectStore.get<ChatTab>(event.identifier);
      if (tab) this.restoreTab(tab);
    }, this.destroyRef);

    this.objectChange.onObjectChangedForSingleAlias('chat-tab-list', () => this.captureDisplay(), this.destroyRef);
    this.objectChange.onObjectChangedForSingleAlias(
      'chat-tab',
      (event) => this.captureTab(event.identifier),
      this.destroyRef
    );
  }

  /** The peer's own chat colours, which the colour panel writes straight onto the cursor. */
  captureColors(): void {
    const cursor = PeerCursor.myCursor;
    if (cursor) this.preferences.setColors(cursor.chatColorCode);
  }

  private restoreColors(): void {
    const stored = this.preferences.colors();
    const cursor = PeerCursor.myCursor;
    if (!stored || !cursor) return;
    for (let i = 0; i < cursor.chatColorCode.length && i < stored.length; i++) {
      cursor.chatColorCode[i] = stored[i];
    }
  }

  private restoreDisplay(): void {
    const stored = this.preferences.display();
    if (!stored) return;
    const list = this.chatTabList;
    list.portraitHeight = Math.min(list.maxPortraitSize, Math.max(list.minPortraitSize, stored.portraitHeight));
    list.isPortraitInWindow = stored.isPortraitInWindow;
    list.isKeepPortraitOutWindow = stored.isKeepPortraitOutWindow;
    list.simpleDispFlagTime = stored.simpleDispFlagTime;
    list.simpleDispFlagUserId = stored.simpleDispFlagUserId;
  }

  private restoreTab(tab: ChatTab): void {
    const stored = this.preferences.tabPreferencesOf(tab.identifier);
    if (!stored) return;
    tab.portraitDisplayFlag = stored.portraitDisplayFlag;
    tab.chatSimpleDispFlag = stored.chatSimpleDispFlag;
  }

  private captureDisplay(): void {
    const list = this.chatTabList;
    this.preferences.setDisplay({
      portraitHeight: list.portraitHeight,
      isPortraitInWindow: list.isPortraitInWindow,
      isKeepPortraitOutWindow: list.isKeepPortraitOutWindow,
      simpleDispFlagTime: list.simpleDispFlagTime,
      simpleDispFlagUserId: list.simpleDispFlagUserId,
    });
  }

  private captureTab(identifier: string): void {
    const tab = this.objectStore.get<ChatTab>(identifier);
    if (!tab) return;
    this.preferences.setTabPreferences(identifier, {
      portraitDisplayFlag: tab.portraitDisplayFlag,
      chatSimpleDispFlag: tab.chatSimpleDispFlag,
    });
  }
}
