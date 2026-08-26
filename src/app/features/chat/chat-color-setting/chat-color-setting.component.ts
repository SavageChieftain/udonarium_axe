import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ChatSettingsEventHandlerService } from '@axe/features/chat/chat-settings-event-handler.service';
import {
  autoChatBubble,
  CHAT_TARGET_RATIO,
  chatColorContrast,
  ChatColorStylePipe,
} from '@axe/ui/pipes/chat-color-style.pipe';
import { TranslocoModule } from '@jsverse/transloco';

export type ChatTheme = 'light' | 'dark';

@Component({
  selector: 'chat-color-setting',
  templateUrl: './chat-color-setting.component.html',
  host: { class: 'block px-3 py-[10px]' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoModule, ChatColorStylePipe, NgStyle],
})
export class ChatColorSettingComponent {
  private readonly modalService = inject(ModalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatSettings = inject(ChatSettingsEventHandlerService);

  readonly themes: readonly ChatTheme[] = ['light', 'dark'];
  readonly slots = [0, 1, 2] as const;

  isAllowedEmpty: boolean = false;
  tabletopObject: GameCharacter | null = null;

  /** Bumped by hand, since the colours live on arrays that no sync var watches element by element. */
  protected readonly revision = signal(0);

  get myPeer(): PeerCursor {
    return PeerCursor.myCursor;
  }

  constructor() {
    const option = this.modalService.option as Record<string, unknown>;
    this.isAllowedEmpty = !!option?.isAllowedEmpty;
  }

  private get owner(): GameCharacter | PeerCursor {
    return this.tabletopObject ?? this.myPeer;
  }

  chatColorCode(num: number): string {
    this.revision();
    return this.owner.chatColorCode[num];
  }

  bubbleCode(num: number, theme: ChatTheme): string {
    this.revision();
    const codes = theme === 'dark' ? this.owner.chatBubbleDark : this.owner.chatBubbleLight;
    return codes[num] ?? '';
  }

  /** What the bubble will actually be: the one that was set, or the one worked out for it. */
  shownBubble(num: number, theme: ChatTheme): string {
    return this.bubbleCode(num, theme) || autoChatBubble(this.chatColorCode(num), theme);
  }

  contrastOf(num: number, theme: ChatTheme): number {
    return chatColorContrast(this.chatColorCode(num), this.bubbleCode(num, theme), theme);
  }

  isHardToRead(num: number, theme: ChatTheme): boolean {
    return this.contrastOf(num, theme) < CHAT_TARGET_RATIO;
  }

  /** Rounded down, so a pair that misses the standard is never shown as having met it. */
  contrastLabel(num: number, theme: ChatTheme): string {
    return (Math.floor(this.contrastOf(num, theme) * 10) / 10).toFixed(1);
  }

  /** The page each preview sits on, so a dark sample reads as a dark room and not as the panel. */
  backdrop(theme: ChatTheme): string {
    return theme === 'dark' ? '#0d1117' : '#d4c8e2';
  }

  labelColor(theme: ChatTheme): string {
    return theme === 'dark' ? '#8b949e' : '#5b4074';
  }

  changeColor(event: string, num: number): void {
    if (this.tabletopObject) {
      this.tabletopObject.chatColorCode[num] = event;
      this.bumpCharacter();
    } else {
      this.myPeer.chatColorCode[num] = event;
      this.chatSettings.captureColors();
    }
    this.touched();
  }

  changeBubble(event: string, num: number, theme: ChatTheme): void {
    const codes = theme === 'dark' ? this.owner.chatBubbleDark : this.owner.chatBubbleLight;
    codes[num] = event;
    if (this.tabletopObject) this.bumpCharacter();
    else this.chatSettings.captureColors();
    this.touched();
  }

  /** Puts the bubble where the colour can be read on it, and leaves it there to be edited. */
  autoAdjust(num: number, theme: ChatTheme): void {
    this.changeBubble(cssToHex(autoChatBubble(this.chatColorCode(num), theme)), num, theme);
  }

  clearBubble(num: number, theme: ChatTheme): void {
    this.changeBubble('', num, theme);
  }

  onChangeColor(event: Event, index: number): void {
    this.changeColor((event.target as HTMLInputElement).value, index);
  }

  onChangeBubble(event: Event, index: number, theme: ChatTheme): void {
    this.changeBubble((event.target as HTMLInputElement).value, index, theme);
  }

  get speakerName(): string {
    return this.tabletopObject?.name || this.myPeer.name;
  }

  private bumpCharacter(): void {
    const object = this.tabletopObject;
    if (!object) return;
    object.syncDummyCounter = object.syncDummyCounter < 2 ? object.syncDummyCounter + 1 : 0;
  }

  private touched(): void {
    this.revision.update((value) => value + 1);
    this.objectChange.notifyChanged(this.owner.identifier);
  }
}

function cssToHex(css: string): string {
  const match = /rgb\((\d+),(\d+),(\d+)\)/.exec(css);
  if (!match) return css;
  return '#' + [1, 2, 3].map((i) => Number(match[i]).toString(16).padStart(2, '0')).join('');
}
