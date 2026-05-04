import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatPortraitImageComponent as ChatPortraitImageComponent_1 } from '@axe/features/chat/chat-portrait-img/chat-portrait-img.component';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-portrait',
  templateUrl: './chat-portrait.component.html',
  styleUrl: './chat-portrait.component.css',
  imports: [NgStyle, ChatPortraitImageComponent_1],
})
export class ChatPortraitComponent {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);

  readonly chatTabidentifier = input('');

  get chatTab(): ChatTab {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  private readonly chatTabListVersion = computed(() => this.objectChange.versionOf('ChatTabList')());

  readonly portraitAreaHeight = computed<number>(() => {
    this.chatTabListVersion();
    const chatTab = this.chatTab;
    if (chatTab) {
      if (chatTab.portraitDisplayFlag) {
        const chatTabList = this.chatTabList;
        if (chatTabList.isPortraitInWindow) {
          return chatTabList.portraitHeight;
        }
      }
    }
    return 0;
  });
}
