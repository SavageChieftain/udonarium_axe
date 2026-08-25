import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CHAT_FONT_SIZE_MAX,
  CHAT_FONT_SIZE_MIN,
  ChatPreferencesService,
} from '@axe/application/chat/chat-preferences.service';
import { SystemAvatarKind, SystemAvatarService } from '@axe/application/chat/system-avatar.service';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { SystemAvatarMenuService } from '@axe/features/chat/system-avatar-menu.service';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'chat-message-setting',
  templateUrl: './chat-message-setting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class ChatMessageSettingComponent {
  private readonly objectStore = inject(ObjectStore);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly chatPrefs = inject(ChatPreferencesService);
  private readonly systemAvatar = inject(SystemAvatarService);
  private readonly systemAvatarMenu = inject(SystemAvatarMenuService);
  private readonly rolePermission = inject(RolePermissionService);
  private readonly objectChange = inject(ObjectChangeService);

  readonly systemAvatarVisible = this.systemAvatar.isVisible;
  readonly speakerAvatarVisible = this.systemAvatar.isSpeakerVisible;

  readonly systemAvatarRows = computed(() => [
    {
      kind: 'system' as SystemAvatarKind,
      labelKey: 'feature.chat.systemAvatar.kindSystem',
      url: this.systemAvatar.systemUrl(),
      hasOwnImage: this.systemAvatar.hasOwnSystemImage(),
    },
    {
      kind: 'dice' as SystemAvatarKind,
      labelKey: 'feature.chat.systemAvatar.kindDice',
      url: this.systemAvatar.diceUrl(),
      hasOwnImage: this.systemAvatar.hasOwnDiceImage(),
    },
  ]);

  readonly canEditRoom = computed<boolean>(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return this.rolePermission.canEditTabletop;
  });

  setSystemAvatarVisible(visible: boolean): void {
    if (!this.canEditRoom()) return;
    this.systemAvatar.setVisible(visible);
  }

  setSpeakerAvatarVisible(visible: boolean): void {
    if (!this.canEditRoom()) return;
    this.systemAvatar.setSpeakerVisible(visible);
  }

  changeSystemAvatarImage(kind: SystemAvatarKind): void {
    this.systemAvatarMenu.changeImage(kind);
  }

  resetSystemAvatarImage(kind: SystemAvatarKind): void {
    if (!this.canEditRoom()) return;
    this.systemAvatar.resetImage(kind);
  }

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
