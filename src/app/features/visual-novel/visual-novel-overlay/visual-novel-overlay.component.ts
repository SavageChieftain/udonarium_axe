import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { ChatTab } from '@axe/domain/chat/chat-tab';
import { ChatTabList } from '@axe/domain/chat/chat-tab-list';
import { canRoleSpeakTab } from '@axe/domain/chat/chat-tab-permission';
import { DataElement } from '@axe/domain/data/data-element';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { Jukebox } from '@axe/domain/media/jukebox';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { allowsChat } from '@axe/features/chat/chat-input/chat-input-helpers';
import {
  ChatPaletteHandle,
  ChatPaletteRegistryService,
} from '@axe/features/chat/chat-palette/chat-palette-registry.service';
import {
  buildVnEmoteSuffix,
  parseVnEmote,
  splitVnEmoteSuffix,
  VN_BUBBLE_ANIMATIONS,
  VN_BUBBLE_SHAPES,
  VN_EMOTION_MARK_CHARS,
  VN_EMOTION_MARKS,
  VN_MESSAGE_KINDS,
  VN_PORTRAIT_EMOTES,
  VnBubbleAnimation,
  VnBubbleShape,
  VnEmotionMark,
  VnMessageKind,
  VnPortraitEmote,
} from '@axe/features/visual-novel/visual-novel-emote';
import { VisualNovelModeService } from '@axe/features/visual-novel/visual-novel-mode.service';
import {
  VisualNovelSettingsService,
  VN_PORTRAIT_ANIMATIONS,
  VN_TEXT_SIZES,
  VN_TYPEWRITER_INTERVAL_MS,
  VN_TYPEWRITER_SPEEDS,
} from '@axe/features/visual-novel/visual-novel-settings.service';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

const STAGE_LOOKBACK = 60;
const STAGE_MAX = 6;
const STAGE_SLOT_COUNT = 12;
const WHEEL_THROTTLE_MS = 160;
const AUTO_PLAY_BASE_WAIT_MS = 1200;
const AUTO_PLAY_PER_CHAR_MS = 35;
const AUTO_PLAY_MAX_WAIT_MS = 4000;

const SYSTEM_ICON_URL = 'assets/images/system_chang.png';
const DICEBOT_ICON_URL = 'assets/images/system_chang_roll.png';

const EMOTION_MARK_COLORS: Record<Exclude<VnEmotionMark, 'none'>, string> = {
  surprise: 'text-red-500',
  question: 'text-sky-500',
  anger: 'text-red-600',
  sweat: 'text-sky-500',
  heart: 'text-pink-500',
  note: 'text-amber-500',
  silence: 'text-gray-500',
};

export interface VnStageCharacter {
  name: string;
  url: string;
  left: number;
  slot: number;
  isActive: boolean;
  isFlipped: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'visual-novel-overlay',
  templateUrl: './visual-novel-overlay.component.html',
  host: {
    class: 'pointer-events-none fixed inset-0 z-160 block',
    '(window:keydown)': 'onKeydown($event)',
  },
  imports: [DatePipe, DraggableDirective, FormsModule, SafePipe, TranslocoModule],
})
export class VisualNovelOverlayComponent {
  protected readonly isCompact = inject(ViewportService).isCompact;
  protected readonly isControlsOpen = signal(false);

  protected toggleControls(): void {
    this.isControlsOpen.update((open) => !open);
  }

  private readonly destroyRef = inject(DestroyRef);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly imageService = inject(ImageService);
  private readonly audioStorage = inject(AudioStorage);
  private readonly paletteRegistry = inject(ChatPaletteRegistryService);
  private readonly panelService = inject(PanelService);
  private readonly t = inject(TRANSLATE_FN);
  private readonly vnMode = inject(VisualNovelModeService);
  readonly settings = inject(VisualNovelSettingsService);

  private readonly renderVersion = signal(0);
  private readonly _seTick = signal(0);
  private readonly cursor = signal(-1);
  private readonly typedLength = signal(0);
  private typingTimer: ReturnType<typeof setInterval> | null = null;
  private revealInstantly = false;
  private lastWheelTime = 0;

  readonly text = signal('');
  readonly autoPlay = signal(false);
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null;
  readonly showBacklog = signal(false);
  readonly showEmote = signal(false);
  readonly showSoundBoard = signal(false);
  readonly showSlotGuide = signal(false);
  readonly showPalette = signal(false);

  readonly selectedKind = signal<VnMessageKind>('normal');
  readonly selectedShape = signal<VnBubbleShape>('normal');
  readonly selectedBubbleAnimation = signal<VnBubbleAnimation>('none');
  readonly selectedPortraitEmote = signal<VnPortraitEmote>('none');
  readonly selectedEmotionMark = signal<VnEmotionMark>('none');

  readonly backlogFilter = signal('');

  readonly typewriterSpeedOptions = VN_TYPEWRITER_SPEEDS;
  readonly portraitAnimationOptions = VN_PORTRAIT_ANIMATIONS;
  readonly textSizeOptions = VN_TEXT_SIZES;
  readonly messageKindOptions = computed(() =>
    this.isGameMaster() ? VN_MESSAGE_KINDS : VN_MESSAGE_KINDS.filter((kind) => kind !== 'scene')
  );

  readonly isGameMaster = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });
  readonly bubbleShapeOptions = VN_BUBBLE_SHAPES;
  readonly bubbleAnimationOptions = VN_BUBBLE_ANIMATIONS;
  readonly portraitEmoteOptions = VN_PORTRAIT_EMOTES;
  readonly emotionMarkOptions = VN_EMOTION_MARKS;
  readonly slotIndexes = Array.from({ length: STAGE_SLOT_COUNT }, (_, i) => i);

  readonly backlogList = viewChild<ElementRef<HTMLDivElement>>('backlogList');

  private readonly _chatTabIdentifier = signal('');
  get chatTabIdentifier(): string {
    return this._chatTabIdentifier();
  }
  set chatTabIdentifier(identifier: string) {
    this.stopAutoPlay();
    this._chatTabIdentifier.set(identifier);
    this.cursor.set(-1);
  }

  private readonly _sendFrom = signal('');
  get sendFrom(): string {
    return this._sendFrom();
  }
  set sendFrom(identifier: string) {
    this._sendFrom.set(identifier);
  }

  get gameType(): string {
    return this.chatMessageService.gameType.length > 0 ? this.chatMessageService.gameType : 'DiceBot';
  }
  set gameType(gameType: string) {
    this.chatMessageService.gameType = gameType;
  }

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }

  readonly chatTab = computed(() => {
    this.objectChange.collectionOf(ChatTab.aliasName)();
    this.objectChange.versionOf(this._chatTabIdentifier())();
    return this.objectStore.get<ChatTab>(this._chatTabIdentifier()) ?? null;
  });

  readonly messages = computed(() => {
    this.renderVersion();
    const tab = this.chatTab();
    if (!tab) return [] as ChatMessage[];
    return tab.chatMessages.filter((message) => message.isDisplayable);
  });

  readonly currentIndex = computed(() => {
    const length = this.messages().length;
    if (length < 1) return -1;
    const cursor = this.cursor();
    if (cursor < 0) return length - 1;
    return Math.min(cursor, length - 1);
  });

  readonly currentMessage = computed(() => this.messages()[this.currentIndex()] ?? null);

  readonly isLatest = computed(() => this.currentIndex() >= this.messages().length - 1);

  private readonly currentText = computed(() => {
    this.renderVersion();
    return this.currentMessage()?.text ?? '';
  });

  private readonly currentEmote = computed(() => parseVnEmote(this.currentText()));

  readonly displayedText = computed(() => this.currentEmote().text.slice(0, this.typedLength()));

  readonly isTyping = computed(() => this.typedLength() < this.currentEmote().text.length);

  readonly speakerName = computed(() => this.currentMessage()?.name ?? '');

  readonly currentMessageList = computed(() => {
    const message = this.currentMessage();
    return message ? [message] : [];
  });

  readonly isShoutShape = computed(() => this.currentEmote().shape === 'shout');

  readonly bubbleBoxClass = computed(() => {
    switch (this.currentEmote().shape) {
      case 'thought':
        return 'vn-bubble-thought bg-white/92 px-6 py-4 shadow-xl';
      case 'shout':
        return 'px-8 py-6 font-bold';
      case 'whisper':
        return 'vn-bubble-whisper px-5 py-3 shadow-xl';
      default:
        return 'vn-bubble-normal rounded-2xl bg-white/92 px-5 py-3 shadow-xl';
    }
  });

  readonly bubbleEnterClass = computed(() => {
    if (this.currentEmote().bubbleAnimation === 'pop') return 'animate-vn-pop';
    switch (this.currentEmote().shape) {
      case 'thought':
        return 'vn-enter-thought';
      case 'shout':
        return 'vn-enter-shout';
      case 'whisper':
        return 'vn-enter-whisper';
      default:
        return 'vn-enter-normal';
    }
  });

  readonly bubbleAnimationClass = computed(() => {
    switch (this.currentEmote().bubbleAnimation) {
      case 'shake':
        return 'animate-vn-shake';
      case 'pulse':
        return 'animate-vn-pulse';
      case 'float':
        return 'animate-vn-float';
      default:
        return '';
    }
  });

  readonly portraitEmoteClass = computed(() => {
    switch (this.currentEmote().portraitEmote) {
      case 'jump':
        return 'animate-vn-jump';
      case 'tremble':
        return 'animate-vn-tremble';
      case 'zoom':
        return 'animate-vn-zoom';
      case 'nod':
        return 'animate-vn-nod';
      case 'sway':
        return 'animate-vn-sway origin-bottom';
      case 'droop':
        return 'animate-vn-droop';
      default:
        return '';
    }
  });

  readonly emotionMark = computed(() => {
    const mark = this.currentEmote().emotionMark;
    if (mark === 'none') return null;
    return { char: VN_EMOTION_MARK_CHARS[mark], colorClass: EMOTION_MARK_COLORS[mark] };
  });

  readonly hasEmoteSelection = computed(
    () =>
      this.selectedKind() !== 'normal' ||
      this.selectedShape() !== 'normal' ||
      this.selectedBubbleAnimation() !== 'none' ||
      this.selectedPortraitEmote() !== 'none' ||
      this.selectedEmotionMark() !== 'none'
  );

  readonly selectedEmoteSuffix = computed(() =>
    buildVnEmoteSuffix({
      kind: this.selectedKind(),
      shape: this.selectedShape(),
      bubbleAnimation: this.selectedBubbleAnimation(),
      portraitEmote: this.selectedPortraitEmote(),
      emotionMark: this.selectedEmotionMark(),
      flipped: false,
    }).trim()
  );

  resetEmote(): void {
    this.selectedKind.set('normal');
    this.selectedShape.set('normal');
    this.selectedBubbleAnimation.set('none');
    this.selectedPortraitEmote.set('none');
    this.selectedEmotionMark.set('none');
  }

  emotionMarkLabel(mark: VnEmotionMark): string {
    return mark === 'none' ? '' : VN_EMOTION_MARK_CHARS[mark];
  }

  readonly stageCharacters = computed<VnStageCharacter[]>(() => {
    this.objectChange.fileVersion();
    const messages = this.messages();
    const index = this.currentIndex();
    if (index < 0) return [];
    const emote = this.currentEmote();
    if (emote.kind === 'location' || emote.kind === 'scene') return [];
    const found = new Map<string, { url: string; slot: number; isFlipped: boolean }>();
    const lowerBound = Math.max(0, index - STAGE_LOOKBACK);
    for (let i = index; i >= lowerBound && found.size < STAGE_MAX; i--) {
      const message = messages[i];
      if (message.isSystemMessage || message.isDicebot) continue;
      if (this.isDiceCommandAt(i)) continue;
      const parsedMessage = parseVnEmote(message.text ?? '');
      if (parsedMessage.kind === 'scene') break;
      if (!this.isGameCharacterSender(message.sendFrom ?? '')) continue;
      const name = message.name ?? '';
      const imageIdentifier = message.imageIdentifier ?? '';
      if (name.length < 1 || imageIdentifier.length < 1) continue;
      if (found.has(name)) continue;
      const url = this.imageService.getEmptyOr(imageIdentifier).url;
      if (url.length < 1) continue;
      const pos = message.imagePos;
      const slot = typeof pos === 'number' && pos >= 0 && pos < STAGE_SLOT_COUNT ? pos : 0;
      found.set(name, { url, slot, isFlipped: parsedMessage.flipped });
    }
    if (found.size < 1) return [];
    const current = this.currentMessage();
    const activeName =
      current &&
      !current.isSystemMessage &&
      !current.isDicebot &&
      emote.kind === 'normal' &&
      !this.currentIsDiceCommand()
        ? current.name
        : '';
    const cast = [...found.entries()].sort(([nameA, a], [nameB, b]) => a.slot - b.slot || nameA.localeCompare(nameB));
    const slotCounts = new Map<number, number>();
    return cast.map(([name, info]) => {
      const duplicates = slotCounts.get(info.slot) ?? 0;
      slotCounts.set(info.slot, duplicates + 1);
      const left = ((info.slot + 0.5) / STAGE_SLOT_COUNT) * 100 + duplicates * 4;
      return {
        name,
        url: info.url,
        left: Math.min(92, Math.max(8, left)),
        slot: info.slot,
        isActive: name === activeName,
        isFlipped: info.isFlipped,
      };
    });
  });

  private isGameCharacterSender(identifier: string): boolean {
    if (identifier.length < 1) return false;
    return this.objectStore.get(identifier) instanceof GameCharacter;
  }

  readonly activeStageCharacter = computed(
    () => this.stageCharacters().find((character) => character.isActive) ?? null
  );

  private isDiceCommandAt(index: number): boolean {
    const messages = this.messages();
    const message = messages[index];
    const next = messages[index + 1];
    if (!message || !next) return false;
    if (message.isSystemMessage || message.isDicebot) return false;
    return next.isDicebot && next.timestamp === message.timestamp + 1 && next.originFrom === message.from;
  }

  readonly currentIsDiceCommand = computed(() => this.isDiceCommandAt(this.currentIndex()));

  readonly diceCommand = computed(() => {
    if (!this.currentIsDiceCommand()) return null;
    const message = this.currentMessage();
    if (!message) return null;
    return { name: message.name ?? '' };
  });

  readonly systemSpeaker = computed(() => {
    const message = this.currentMessage();
    if (!message) return null;
    if (message.isDicebot) {
      const roller = this.findDiceRoller(message);
      return { imageUrl: DICEBOT_ICON_URL, rollerName: roller?.name ?? '', rollerImageUrl: roller?.imageUrl ?? '' };
    }
    if (message.isSystemMessage || message.isSystem) {
      return { imageUrl: SYSTEM_ICON_URL, rollerName: '', rollerImageUrl: '' };
    }
    return null;
  });

  private findDiceRoller(message: ChatMessage): { name: string; imageUrl: string } | null {
    this.objectChange.fileVersion();
    const matched = /^<(?:Secret-)?BCDice[：:](.+)>$/.exec(message.name ?? '');
    const messages = this.messages();
    const index = this.currentIndex();
    for (let i = index - 1; i >= Math.max(0, index - 5); i--) {
      const candidate = messages[i];
      if (!candidate) continue;
      if (candidate.timestamp === message.timestamp - 1 && candidate.from === (message.originFrom ?? '')) {
        return {
          name: matched?.[1] ?? candidate.name ?? '',
          imageUrl: this.imageService.getEmptyOr(candidate.imageIdentifier ?? '').url,
        };
      }
    }
    return matched ? { name: matched[1], imageUrl: '' } : null;
  }

  readonly narrationKind = computed(() => {
    if (!this.currentMessage() || this.systemSpeaker()) return null;
    const kind = this.currentEmote().kind;
    return kind === 'normal' ? null : kind;
  });

  readonly bubbleAnchor = computed(() => {
    if (!this.currentMessage() || this.systemSpeaker() || this.narrationKind() || this.currentIsDiceCommand())
      return null;
    const active = this.activeStageCharacter();
    if (active) return { left: Math.min(83, Math.max(17, active.left)), bottom: '58vh' };
    return { left: 50, bottom: '22vh' };
  });

  readonly currentFullText = computed(() => this.currentEmote().text);

  readonly bubbleTextSizeClass = computed(() => {
    switch (this.settings.textSize()) {
      case 'small':
        return 'text-[13px]/relaxed';
      case 'large':
        return 'text-[19px]/relaxed';
      default:
        return 'text-[15px]/relaxed';
    }
  });

  readonly narrationTextSizeClass = computed(() => {
    switch (this.settings.textSize()) {
      case 'small':
        return 'text-base/loose';
      case 'large':
        return 'text-2xl/loose';
      default:
        return 'text-lg/loose';
    }
  });

  readonly speakClass = computed(() => (this.currentIndex() % 2 === 0 ? 'animate-vn-speak-a' : 'animate-vn-speak-b'));

  readonly portraitAnimationClass = computed(() => {
    switch (this.settings.portraitAnimation()) {
      case 'fade':
        return 'animate-vn-fade-in';
      case 'slide':
        return 'animate-vn-slide-in';
      case 'bounce':
        return 'animate-vn-bounce-in';
      default:
        return '';
    }
  });

  readonly backlogEntries = computed(() => {
    this.objectChange.fileVersion();
    return this.messages().map((message, index) => {
      const { text, suffix } = splitVnEmoteSuffix(message.text ?? '');
      const hasPortrait = !message.isSystemMessage && !message.isDicebot;
      return {
        message,
        index,
        text,
        suffix,
        imageUrl: hasPortrait ? this.imageService.getEmptyOr(message.imageIdentifier).url : '',
      };
    });
  });

  readonly filteredBacklogEntries = computed(() => {
    const keyword = this.backlogFilter().trim().toLowerCase();
    const entries = this.backlogEntries();
    if (keyword.length < 1) return entries;
    return entries.filter(
      (entry) =>
        entry.text.toLowerCase().includes(keyword) || (entry.message.name ?? '').toLowerCase().includes(keyword)
    );
  });

  readonly gameCharacters = computed(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const all = this.objectStore.getObjects<GameCharacter>(GameCharacter);
    for (const character of all) this.objectChange.versionOf(character.identifier)();
    const myPeerId = PeerCursor.myCursor?.peerId ?? '';
    return all.filter((character) => allowsChat(character, myPeerId));
  });

  readonly speakerOptions = computed(() => {
    const characters = this.gameCharacters();
    const current = this.objectStore.get(this._sendFrom());
    if (current instanceof GameCharacter && !characters.includes(current)) return [current, ...characters];
    return characters;
  });

  readonly speakerPalette = computed(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return [] as string[];
    this.objectChange.versionOf(object.identifier)();
    return object.chatPalette?.getPalette() ?? [];
  });

  readonly canSpeak = computed(() => {
    const tab = this.chatTab();
    if (!tab) return false;
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return canRoleSpeakTab(tab, PeerCursor.myRole);
  });

  readonly speakerSlot = computed(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return -1;
    this.objectChange.versionOf(object.identifier)();
    const element = object.detailDataElement?.getFirstElementByName('POS');
    if (!element) return -1;
    const value = Number(element.currentValue ?? 0);
    return Number.isNaN(value) ? 0 : Math.min(STAGE_SLOT_COUNT - 1, Math.max(0, value));
  });

  readonly speakerPortrait = computed(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return null;
    this.objectChange.versionOf(object.identifier)();
    const children = object.imageDataElement?.children ?? [];
    if (children.length < 1) return null;
    const index = Math.min(Math.max(0, object.selectedPortraitIndex), children.length - 1);
    const url = this.imageService.getEmptyOr((children[index]?.value as string) ?? '').url;
    return { index, count: children.length, url };
  });

  stepSpeakerPortrait(direction: number): void {
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return;
    const count = object.imageDataElement?.children.length ?? 0;
    const next = object.selectedPortraitIndex + direction;
    if (next < 0 || next >= count) return;
    object.selectedPortraitIndex = next;
  }

  readonly soundEffects = computed(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('audio-tag')();
    return this.audioStorage.audios.filter((audio) => !audio.isHidden && AudioTag.get(audio.identifier)?.tag === 'SE');
  });

  private get jukebox(): Jukebox | null {
    return this.objectStore.get<Jukebox>('Jukebox') ?? null;
  }

  playSoundEffect(identifier: string): void {
    this.jukebox?.play(identifier);
  }

  stopSoundEffect(identifier: string): void {
    this.jukebox?.stopSE(identifier);
  }

  isSoundEffectPlaying(identifier: string): boolean {
    this._seTick();
    return this.jukebox?.isSePlaying(identifier) ?? false;
  }

  readonly attachedSe = signal<{ identifier: string; name: string } | null>(null);

  attachSe(identifier: string, name: string): void {
    this.attachedSe.set({ identifier, name });
    this.showSoundBoard.set(false);
  }

  clearAttachedSe(): void {
    this.attachedSe.set(null);
  }

  readonly speakerFlip = computed(() => {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return null;
    this.objectChange.versionOf(object.identifier)();
    const element = object.detailDataElement?.getFirstElementByName('FLIP');
    return element ? Number(element.value) === 1 : false;
  });

  toggleSpeakerFlip(): void {
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return;
    let element = object.detailDataElement?.getFirstElementByName('FLIP') ?? null;
    if (!element) {
      const posElement = object.detailDataElement?.getFirstElementByName('POS');
      const parent = posElement?.parent instanceof DataElement ? posElement.parent : object.detailDataElement;
      if (!parent) return;
      element = DataElement.create('FLIP', 0, {}, `FLIP_${object.identifier}`);
      parent.appendChild(element);
    }
    element.value = Number(element.value) === 1 ? 0 : 1;
    element.update();
  }

  readonly editingIndex = signal(-1);
  readonly editText = signal('');
  readonly editKind = signal<VnMessageKind>('normal');
  readonly editShape = signal<VnBubbleShape>('normal');
  readonly editBubbleAnimation = signal<VnBubbleAnimation>('none');
  readonly editPortraitEmote = signal<VnPortraitEmote>('none');
  readonly editEmotionMark = signal<VnEmotionMark>('none');
  readonly editFlipped = signal(false);
  readonly editSlot = signal(-1);

  startEditEntry(entry: { message: ChatMessage; index: number }): void {
    if (!entry.message.changeable) return;
    const parsed = parseVnEmote(entry.message.text ?? '');
    this.editText.set(parsed.text);
    this.editKind.set(parsed.kind);
    this.editShape.set(parsed.shape);
    this.editBubbleAnimation.set(parsed.bubbleAnimation);
    this.editPortraitEmote.set(parsed.portraitEmote);
    this.editEmotionMark.set(parsed.emotionMark);
    this.editFlipped.set(parsed.flipped);
    const pos = entry.message.imagePos;
    this.editSlot.set(typeof pos === 'number' && pos >= 0 && pos < STAGE_SLOT_COUNT ? pos : -1);
    this.editingIndex.set(entry.index);
  }

  cancelEditEntry(): void {
    this.editingIndex.set(-1);
  }

  saveEditEntry(): void {
    const message = this.messages()[this.editingIndex()];
    if (!message?.changeable) {
      this.editingIndex.set(-1);
      return;
    }
    const text = this.editText().trim();
    if (text.length < 1) return;
    const next =
      text +
      buildVnEmoteSuffix({
        kind: this.editKind(),
        shape: this.editShape(),
        bubbleAnimation: this.editBubbleAnimation(),
        portraitEmote: this.editPortraitEmote(),
        emotionMark: this.editEmotionMark(),
        flipped: this.editFlipped(),
      });
    if (message.text !== next) {
      message.text = next;
      message.fixd = true;
    }
    if (this.editSlot() >= 0 && message.imagePos !== this.editSlot()) {
      message.imagePos = this.editSlot();
    }
    this.editingIndex.set(-1);
  }

  constructor() {
    const tabs = this.chatMessageService.chatTabs;
    this._chatTabIdentifier.set(tabs.length > 0 ? tabs[0].identifier : '');
    this._sendFrom.set(this.gameCharacters()[0]?.identifier ?? '');

    const seTimer = setInterval(() => {
      if (this.showSoundBoard()) this._seTick.update((v) => v + 1);
    }, 500);
    this.destroyRef.onDestroy(() => clearInterval(seTimer));

    this.objectChange.messageAdded$.subscribe(() => {
      this.renderVersion.update((version) => version + 1);
    }, this.destroyRef);
    this.objectChange.onObjectChangedForAlias(
      [ChatMessage.aliasName],
      () => this.renderVersion.update((version) => version + 1),
      this.destroyRef
    );
    this.objectChange.onObjectChangedForAlias(
      [ChatTab.aliasName, ChatTabList.aliasName],
      () => {
        if (this.objectStore.get<ChatTab>(this._chatTabIdentifier())) return;
        const chatTabs = this.chatMessageService.chatTabs;
        this._chatTabIdentifier.set(chatTabs.length > 0 ? chatTabs[0].identifier : '');
      },
      this.destroyRef
    );

    effect(() => {
      const message = this.currentMessage();
      untracked(() => this.restartTypewriter(message));
    });
    effect(() => {
      if (!this.showBacklog()) return;
      const list = this.backlogList()?.nativeElement;
      if (!list) return;
      const row = list.querySelector<HTMLElement>(`[data-vn-log-index="${this.currentIndex()}"]`);
      if (row) {
        row.scrollIntoView({ block: 'center' });
      } else {
        list.scrollTop = list.scrollHeight;
      }
    });
    effect(() => {
      const characters = this.gameCharacters();
      const current = untracked(() => this._sendFrom());
      const object = untracked(() => this.objectStore.get(current));
      if (object instanceof GameCharacter) return;
      this._sendFrom.set(characters[0]?.identifier ?? '');
    });
    this.paletteRegistry.register(this.paletteHandle);
    this.destroyRef.onDestroy(() => this.paletteRegistry.unregister(this.paletteHandle));
    effect(() => {
      const active = this.autoPlay();
      const typing = this.isTyping();
      const index = this.currentIndex();
      untracked(() => {
        if (this.autoPlayTimer != null) {
          clearTimeout(this.autoPlayTimer);
          this.autoPlayTimer = null;
        }
        if (!active || typing) return;
        if (index < 0 || index >= this.messages().length - 1) {
          this.autoPlay.set(false);
          return;
        }
        const wait =
          Math.min(
            AUTO_PLAY_MAX_WAIT_MS,
            AUTO_PLAY_BASE_WAIT_MS + this.currentEmote().text.length * AUTO_PLAY_PER_CHAR_MS
          ) / this.settings.autoPlaySpeed();
        this.autoPlayTimer = setTimeout(() => {
          this.autoPlayTimer = null;
          this.advance();
        }, wait);
      });
    });
    this.destroyRef.onDestroy(() => {
      this.stopTypewriter();
      this.stopAutoPlay();
    });
  }

  toggleAutoPlay(): void {
    if (this.autoPlay()) {
      this.stopAutoPlay();
      return;
    }
    this.closePopovers();
    this.revealInstantly = false;
    if (this.messages().length > 0) this.cursor.set(0);
    this.autoPlay.set(true);
  }

  stopAutoPlay(): void {
    this.autoPlay.set(false);
    if (this.autoPlayTimer != null) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  userAdvance(): void {
    this.stopAutoPlay();
    this.advance();
  }

  userBack(): void {
    this.stopAutoPlay();
    this.back();
  }

  exit(): void {
    this.vnMode.deactivate();
  }

  advance(): void {
    if (this.isTyping()) {
      this.stopTypewriter();
      this.typedLength.set(this.currentText().length);
      return;
    }
    const index = this.currentIndex();
    const lastIndex = this.messages().length - 1;
    if (index < 0 || index >= lastIndex) {
      this.cursor.set(-1);
      return;
    }
    this.cursor.set(index + 1 >= lastIndex ? -1 : index + 1);
  }

  back(): void {
    const index = this.currentIndex();
    if (index <= 0) return;
    this.revealInstantly = true;
    this.cursor.set(index - 1);
  }

  toLatest(): void {
    this.stopAutoPlay();
    this.cursor.set(-1);
  }

  jumpTo(index: number): void {
    this.stopAutoPlay();
    const lastIndex = this.messages().length - 1;
    if (index < 0 || lastIndex < 0) return;
    this.revealInstantly = true;
    this.cursor.set(index >= lastIndex ? -1 : index);
    this.showBacklog.set(false);
  }

  private closePopovers(): void {
    this.showBacklog.set(false);
    this.showEmote.set(false);
    this.showSoundBoard.set(false);
    this.showSlotGuide.set(false);
    this.showPalette.set(false);
  }

  toggleBacklog(): void {
    const next = !this.showBacklog();
    this.closePopovers();
    this.showBacklog.set(next);
    if (!next) this.editingIndex.set(-1);
  }

  toggleEmote(): void {
    const next = !this.showEmote();
    this.closePopovers();
    this.showEmote.set(next);
  }

  toggleSoundBoard(): void {
    const next = !this.showSoundBoard();
    this.closePopovers();
    this.showSoundBoard.set(next);
  }

  toggleSlotGuide(): void {
    if (this.speakerSlot() < 0) return;
    const next = !this.showSlotGuide();
    this.closePopovers();
    this.showSlotGuide.set(next);
  }

  private readonly paletteHandle: ChatPaletteHandle = {
    setCharacterById: (identifier: string) => {
      const object = this.objectStore.get(identifier);
      if (object instanceof GameCharacter) this._sendFrom.set(identifier);
    },
  };

  private sheetPanelService: PanelService | null = null;
  readonly sheetOpen = signal(false);

  toggleCharacterSheet(): void {
    if (this.sheetPanelService?.isShow) {
      this.sheetPanelService.close();
      this.sheetPanelService = null;
      this.sheetOpen.set(false);
      return;
    }
    this.sheetPanelService = null;
    this.sheetOpen.set(false);
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return;
    this.closePopovers();
    let title = this.t('feature.character.panel.sheet');
    if (object.name.length > 0) title += ' - ' + object.name;
    const option: PanelOption = {
      title,
      left: 60,
      top: 60,
      width: 800,
      height: Math.min(600, Math.max(360, window.innerHeight - 320)),
    };
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = object;
    this.sheetPanelService = (component as unknown as { panelService: PanelService }).panelService;
    this.sheetOpen.set(true);
  }

  togglePalette(): void {
    const next = !this.showPalette();
    this.closePopovers();
    this.showPalette.set(next);
  }

  pickPaletteLine(line: string): void {
    this.text.set(line);
    this.showPalette.set(false);
  }

  pickSlot(slot: number): void {
    const object = this.objectStore.get(this._sendFrom());
    if (object instanceof GameCharacter) {
      const element = object.detailDataElement?.getFirstElementByName('POS');
      if (element) element.currentValue = Math.min(STAGE_SLOT_COUNT - 1, Math.max(0, slot));
    }
    this.showSlotGuide.set(false);
  }

  onMessageWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const now = performance.now();
    if (now - this.lastWheelTime < WHEEL_THROTTLE_MS) return;
    this.lastWheelTime = now;
    if (event.deltaY < 0) {
      this.userBack();
    } else {
      this.userAdvance();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const tagName = target?.tagName.toLowerCase() ?? '';
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable) return;
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.userAdvance();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.userBack();
        break;
      case 'Escape':
        if (
          this.showBacklog() ||
          this.showEmote() ||
          this.showSoundBoard() ||
          this.showSlotGuide() ||
          this.showPalette()
        ) {
          this.closePopovers();
        } else {
          this.exit();
        }
        break;
    }
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    this.send();
  }

  send(): void {
    this.stopAutoPlay();
    const tab = this.chatTab();
    const text = this.text().trim();
    if (!tab || text.length < 1 || !this.canSpeak()) return;
    let sendFrom = this._sendFrom();
    if (!this.objectStore.get(sendFrom)) {
      sendFrom = this.gameCharacters()[0]?.identifier ?? PeerCursor.myCursor?.identifier ?? '';
      this._sendFrom.set(sendFrom);
    }
    const speaker = this.objectStore.get(sendFrom);
    let evaluated = text;
    if (speaker instanceof GameCharacter) {
      const palette = speaker.chatPalette;
      if (palette) evaluated = palette.evaluate(text, speaker.rootDataElement ?? undefined);
    }
    const outText =
      evaluated +
      buildVnEmoteSuffix({
        kind: this.selectedKind(),
        shape: this.selectedShape(),
        bubbleAnimation: this.selectedBubbleAnimation(),
        portraitEmote: this.selectedPortraitEmote(),
        emotionMark: this.selectedEmotionMark(),
        flipped: this.speakerFlip() === true,
      });
    const attachedSe = this.attachedSe();
    DiceBot.loadGameSystemAsync(this.gameType).then((gameSystem) => {
      this.chatMessageService.sendMessage(
        tab,
        outText,
        gameSystem,
        sendFrom,
        undefined,
        this.portraitIndexOf(sendFrom),
        this.colorOf(sendFrom),
        [{ text: outText, object: null }]
      );
      if (attachedSe) this.jukebox?.play(attachedSe.identifier);
    });
    this.attachedSe.set(null);
    this.text.set('');
    this.cursor.set(-1);
  }

  private portraitIndexOf(sendFrom: string): number {
    const object = this.objectStore.get(sendFrom);
    return object instanceof GameCharacter ? object.selectedPortraitIndex : 0;
  }

  private colorOf(sendFrom: string): string {
    const object = this.objectStore.get(sendFrom);
    if (object instanceof GameCharacter) return object.chatColorCode[0];
    return PeerCursor.myCursor?.chatColorCode[0] ?? '#000000';
  }

  private restartTypewriter(message: ChatMessage | null): void {
    this.stopTypewriter();
    const parsed = parseVnEmote(message?.text ?? '');
    const total = parsed.text.length;
    const interval = VN_TYPEWRITER_INTERVAL_MS[this.settings.typewriterSpeed()];
    const isDiceCommand = untracked(() => this.currentIsDiceCommand());
    if (
      this.revealInstantly ||
      interval < 1 ||
      parsed.kind === 'location' ||
      parsed.kind === 'scene' ||
      isDiceCommand
    ) {
      this.revealInstantly = false;
      this.typedLength.set(total);
      return;
    }
    this.typedLength.set(0);
    if (total < 1) return;
    this.typingTimer = setInterval(() => {
      this.typedLength.update((length) => Math.min(total, length + 1));
      if (this.typedLength() >= total) this.stopTypewriter();
    }, interval);
  }

  private stopTypewriter(): void {
    if (this.typingTimer == null) return;
    clearInterval(this.typingTimer);
    this.typingTimer = null;
  }
}
