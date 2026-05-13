import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';

@Component({
  selector: 'chat-message-setting',
  templateUrl: './chat-message-setting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class ChatMessageSettingComponent {
  private readonly objectStore = inject(ObjectStore);
  private readonly uiSignalService = inject(UiSignalService);

  chatTabidentifier: string = '';

  get chatTab(): ChatTab | null {
    return this.objectStore.get<ChatTab>(this.chatTabidentifier) ?? null;
  }

  get chatTabList(): ChatTabList {
    return this.objectStore.get<ChatTabList>('ChatTabList')!;
  }

  chkHeight(newNum: number) {
    if (newNum <= this.chatTabList.minPortraitSize) this.chatTabList.portraitHeight = this.chatTabList.minPortraitSize;
    if (newNum >= this.chatTabList.maxPortraitSize) this.chatTabList.portraitHeight = this.chatTabList.maxPortraitSize;
  }

  onChkHeight(event: Event): void {
    this.chkHeight((event.target as HTMLInputElement).valueAsNumber);
  }

  changeSimpleDisp() {
    this.uiSignalService.notifyChatRedraw();
  }

  changeDispFlagTime() {
    this.uiSignalService.notifyChatRedraw();
  }

  changeDispFlagUserId() {
    this.uiSignalService.notifyChatRedraw();
  }

  changePortraitInWindow() {}

  changeKeepPortraitOutWindow() {}
}
