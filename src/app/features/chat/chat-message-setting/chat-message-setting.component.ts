import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CHAT_FONT_SIZE_MAX,
  CHAT_FONT_SIZE_MIN,
  ChatPreferencesService,
} from '@axe/application/chat/chat-preferences.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'chat-message-setting',
  templateUrl: './chat-message-setting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
})
export class ChatMessageSettingComponent {
  private readonly objectStore = inject(ObjectStore);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly chatPrefs = inject(ChatPreferencesService);

  readonly autoFollowScroll = this.chatPrefs.autoFollowScroll;
  readonly fontSize = this.chatPrefs.fontSize;
  readonly minFontSize = CHAT_FONT_SIZE_MIN;
  readonly maxFontSize = CHAT_FONT_SIZE_MAX;

  setAutoFollowScroll(v: boolean): void {
    this.chatPrefs.setAutoFollowScroll(v);
  }

  onChangeFontSize(event: Event): void {
    this.chatPrefs.setFontSize((event.target as HTMLInputElement).valueAsNumber);
  }

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
