import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { ChatPortraitImageComponent as ChatPortraitImageComponent_1 } from '@axe/features/chat/chat-portrait-img/chat-portrait-img.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'chat-portrait',
  templateUrl: './chat-portrait.component.html',
  styleUrl: './chat-portrait.component.css',
  imports: [NgStyle, ChatPortraitImageComponent_1],
})
export class ChatPortraitComponent {
  private readonly objectStore = inject(ObjectStore);

  readonly chatTabidentifier = input('');

  get chatTab(): ChatTab {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier())!;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  get portraitAreaHeight(): number {
    if (this.chatTab) {
      if (this.chatTab.portraitDisplayFlag) {
        if (this.chatTabList.isPortraitInWindow) {
          return this.chatTabList.portraitHeight;
        }
      }
    }
    return 0;
  }
}
