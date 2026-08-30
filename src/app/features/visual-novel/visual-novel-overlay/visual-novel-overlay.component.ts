import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { SystemAvatarKind, SystemAvatarService } from '@axe/application/chat/system-avatar.service';
import { LanguageService } from '@axe/application/i18n/language.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { KeyboardInsetService } from '@axe/application/ui/keyboard-inset.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { sheetPanelTitle } from '@axe/application/ui/sheet-panel';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { AudioStorage } from '@axe/core/storage/audio-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { portraitNameOf } from '@axe/domain/character/character-portrait';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { canRoleSpeakTab } from '@axe/domain/chat/chat-tab-permission';
import { DataElement } from '@axe/domain/data/data-element';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { AudioTag } from '@axe/domain/media/audio-tag';
import { Jukebox } from '@axe/domain/media/jukebox';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import {
  isVnPortraitPosSet,
  toPortraitSlot,
  VN_PORTRAIT_POS_UNSET,
} from '@axe/domain/visual-novel/vn-portrait-position';
import { VN_STAGE_TRANSITIONS } from '@axe/domain/visual-novel/vn-stage';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { allowsChat } from '@axe/features/chat/chat-input/chat-input-helpers';
import {
  ChatPaletteHandle,
  ChatPaletteRegistryService,
} from '@axe/features/chat/chat-palette/chat-palette-registry.service';
import { SystemAvatarMenuService } from '@axe/features/chat/system-avatar-menu.service';
import { VisualNovelBacklogComponent } from '@axe/features/visual-novel/visual-novel-backlog/visual-novel-backlog.component';
import { VisualNovelDirectorService } from '@axe/features/visual-novel/visual-novel-director.service';
import {
  buildVnEmoteSuffix,
  parseVnEmote,
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
import { readableMessageName, readableMessageText } from '@axe/features/visual-novel/visual-novel-message';
import { VisualNovelModeService } from '@axe/features/visual-novel/visual-novel-mode.service';
import { VisualNovelPlaybackService } from '@axe/features/visual-novel/visual-novel-playback.service';
import { VisualNovelSceneService } from '@axe/features/visual-novel/visual-novel-scene.service';
import {
  VisualNovelSettingsService,
  VN_LAYOUTS,
  VN_PORTRAIT_ANIMATIONS,
  VN_READABILITY_LEVELS,
  VN_TEXT_SIZES,
  VN_TYPEWRITER_SPEEDS,
} from '@axe/features/visual-novel/visual-novel-settings.service';
import {
  isTypingTarget,
  type VisualNovelCommand,
  visualNovelKeyDown,
  visualNovelKeyUp,
} from '@axe/features/visual-novel/visual-novel-shortcut';
import {
  buildVnStage,
  leftOfSlot,
  slotBandLeft,
  slotBandWidth,
  slotLabelLeftInBand,
  VN_STAGE_LOOKBACK,
  VN_STAGE_SLOT_COUNT,
  VnStageCharacter,
  VnStageSource,
} from '@axe/features/visual-novel/visual-novel-stage';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

const WHEEL_THROTTLE_MS = 160;

const SHORTCUT_HELP_ITEMS: readonly { keys: string; labelKey: string }[] = [
  { keys: 'Enter / Space / → / ↓', labelKey: 'next' },
  { keys: '← / ↑', labelKey: 'prev' },
  { keys: 'Ctrl', labelKey: 'skip' },
  { keys: 'Home / End', labelKey: 'edges' },
  { keys: 'A', labelKey: 'autoPlay' },
  { keys: 'L', labelKey: 'log' },
  { keys: 'S', labelKey: 'slot' },
  { keys: 'Esc', labelKey: 'close' },
];

const EMOTION_MARK_COLORS: Record<Exclude<VnEmotionMark, 'none'>, string> = {
  surprise: 'text-red-500',
  question: 'text-sky-500',
  anger: 'text-red-600',
  sweat: 'text-sky-500',
  heart: 'text-pink-500',
  note: 'text-amber-500',
  silence: 'text-gray-500',
};

/** The balloon, of which one opens at a time. */
type VisualNovelPopover = 'backlog' | 'emote' | 'soundBoard' | 'slotGuide' | 'palette' | 'shortcutHelp';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'visual-novel-overlay',
  templateUrl: './visual-novel-overlay.component.html',
  host: {
    class: 'pointer-events-none fixed inset-0 z-160 block',
    '(window:keydown)': 'onKeydown($event)',
    '(window:keyup)': 'onKeyup($event)',
    '(window:blur)': 'stopSkip()',
  },
  imports: [FormsModule, SafePipe, TranslocoModule, VisualNovelBacklogComponent, NgSelectComponent, NgOptionComponent],
})
export class VisualNovelOverlayComponent {
  protected readonly isCompact = inject(ViewportService).isCompact;
  protected readonly keyboardInset = inject(KeyboardInsetService).inset;
  protected readonly isControlsOpen = signal(false);

  protected toggleControls(): void {
    this.isControlsOpen.update((open) => !open);
  }

  private readonly destroyRef = inject(DestroyRef);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly chatMessageService = inject(ChatMessageService);
  private readonly imageService = inject(ImageService);
  private readonly systemAvatar = inject(SystemAvatarService);
  private readonly systemAvatarMenu = inject(SystemAvatarMenuService);
  private readonly audioStorage = inject(AudioStorage);
  private readonly paletteRegistry = inject(ChatPaletteRegistryService);
  private readonly panelService = inject(PanelService);
  private readonly t = inject(TRANSLATE_FN);
  private readonly language = inject(LanguageService);
  private readonly vnMode = inject(VisualNovelModeService);
  readonly settings = inject(VisualNovelSettingsService);

  private readonly playback = inject(VisualNovelPlaybackService);
  readonly scene = inject(VisualNovelSceneService);
  readonly director = inject(VisualNovelDirectorService);

  readonly readabilityClass = computed(() => {
    switch (this.settings.readability()) {
      case 1:
        return 'bg-black/25 backdrop-blur-[1px]';
      case 2:
        return 'bg-black/40 backdrop-blur-xs';
      case 3:
        return 'bg-black/55 backdrop-blur-sm';
      default:
        return '';
    }
  });

  readonly backgroundFrames = computed(() => {
    const url = this.scene.backgroundUrl();
    if (url.length < 1) return [];
    return [{ key: `${url}#${this.scene.transitionTrigger()}`, url }];
  });

  readonly backgroundTransitionClass = computed(() => {
    if (this.settings.reduceMotion()) return '';
    switch (this.scene.transition()) {
      case 'wipe':
        return 'vn-bg-wipe';
      case 'fade':
        return 'vn-bg-fade';
      default:
        return '';
    }
  });

  private readonly _seTick = signal(0);
  private lastWheelTime = 0;

  readonly text = signal('');
  readonly autoPlay = this.playback.autoPlay;
  /**
   * Only ever one is open.
   *
   * A flag per kind would mean writing close-the-others every time, and one missed leaves two open.
   */
  private readonly openPopover = signal<VisualNovelPopover | null>(null);
  readonly isSkipping = this.playback.isSkipping;

  readonly selectedKind = signal<VnMessageKind>('normal');
  readonly selectedShape = signal<VnBubbleShape>('normal');
  readonly selectedBubbleAnimation = signal<VnBubbleAnimation>('none');
  readonly selectedPortraitEmote = signal<VnPortraitEmote>('none');
  readonly selectedEmotionMark = signal<VnEmotionMark>('none');
  readonly selectedExit = signal(false);

  readonly typewriterSpeedOptions = VN_TYPEWRITER_SPEEDS;
  readonly portraitAnimationOptions = VN_PORTRAIT_ANIMATIONS;
  readonly textSizeOptions = VN_TEXT_SIZES;
  readonly layoutOptions = VN_LAYOUTS;
  readonly readabilityOptions = VN_READABILITY_LEVELS;
  readonly transitionOptions = VN_STAGE_TRANSITIONS;
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
  readonly slotIndexes = Array.from({ length: VN_STAGE_SLOT_COUNT }, (_, i) => i);
  readonly shortcutHelpItems = SHORTCUT_HELP_ITEMS;

  get chatTabIdentifier(): string {
    return this.playback.chatTabIdentifier();
  }
  set chatTabIdentifier(identifier: string) {
    this.playback.setChatTab(identifier);
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

  readonly chatTab = this.playback.chatTab;
  readonly messages = this.playback.messages;
  readonly currentIndex = this.playback.currentIndex;
  readonly currentMessage = this.playback.currentMessage;
  readonly isLatest = this.playback.isLatest;
  readonly displayedText = this.playback.displayedText;
  readonly isTyping = this.playback.isTyping;
  readonly currentFullText = this.playback.currentFullText;
  readonly currentIsDiceCommand = this.playback.currentIsDiceCommand;

  private readonly currentEmote = this.playback.currentEmote;

  readonly speakerName = computed(() => {
    this.language.currentLang();
    return readableMessageName(this.currentMessage(), this.t);
  });

  readonly announcedLine = computed(() => {
    if (this.isTyping()) return '';
    const name = this.speakerName();
    const text = this.currentFullText();
    if (text.length < 1) return '';
    return name.length > 0 ? `${name}: ${text}` : text;
  });

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
    if (this.settings.reduceMotion()) return '';
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
    if (this.settings.reduceMotion()) return '';
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
    if (this.settings.reduceMotion()) return '';
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
      this.selectedEmotionMark() !== 'none' ||
      this.selectedExit()
  );

  readonly selectedEmoteSuffix = computed(() =>
    buildVnEmoteSuffix({
      kind: this.selectedKind(),
      shape: this.selectedShape(),
      bubbleAnimation: this.selectedBubbleAnimation(),
      portraitEmote: this.selectedPortraitEmote(),
      emotionMark: this.selectedEmotionMark(),
      flipped: false,
      exited: this.selectedExit(),
    }).trim()
  );

  resetEmote(): void {
    this.selectedKind.set('normal');
    this.selectedShape.set('normal');
    this.selectedBubbleAnimation.set('none');
    this.selectedPortraitEmote.set('none');
    this.selectedEmotionMark.set('none');
    this.selectedExit.set(false);
  }

  toggleSelectedExit(): void {
    this.selectedExit.update((exited) => !exited);
  }

  emotionMarkLabel(mark: VnEmotionMark): string {
    return mark === 'none' ? '' : VN_EMOTION_MARK_CHARS[mark];
  }

  readonly stageCharacters = computed<VnStageCharacter[]>(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    this.language.currentLang();
    const messages = this.messages();
    const index = this.currentIndex();
    if (index < 0) return [];
    const window: VnStageSource[] = [];
    for (let i = Math.max(0, index - VN_STAGE_LOOKBACK); i <= index; i++) {
      const message = messages[i];
      window.push({
        name: readableMessageName(message, this.t),
        sendFrom: message.sendFrom ?? '',
        imageIdentifier: message.imageIdentifier ?? '',
        imagePos: message.imagePos,
        vnPortraitPos: message.vnPortraitPos,
        isSystemMessage: message.isSystemMessage,
        isDicebot: message.isDicebot,
        isGameCharacter: this.isGameCharacterSender(message.sendFrom ?? ''),
        isDiceCommand: this.playback.isDiceCommandAt(i),
        emote: parseVnEmote(readableMessageText(message, this.t)),
      });
    }
    return buildVnStage(
      window,
      (imageIdentifier) => this.imageService.getEmptyOr(imageIdentifier).url,
      (source) => this.stageSlotOf(source)
    );
  });

  /** A line of its own beats the character's novel-mode place, which beats where it stands in chat. */
  private stageSlotOf(source: VnStageSource): number {
    const linePosition = toPortraitSlot(source.vnPortraitPos);
    if (linePosition != null) return linePosition;
    const character = this.objectStore.get(source.sendFrom);
    if (character instanceof GameCharacter) {
      this.objectChange.versionOf(character.identifier)();
      const novelPosition = toPortraitSlot(character.vnPortraitPos);
      if (novelPosition != null) return novelPosition;
      const chatPosition = character.portraitPosition;
      if (chatPosition != null) return chatPosition;
    }
    return toPortraitSlot(source.imagePos) ?? 0;
  }

  private isGameCharacterSender(identifier: string): boolean {
    if (identifier.length < 1) return false;
    return this.objectStore.get(identifier) instanceof GameCharacter;
  }

  readonly activeStageCharacter = computed(
    () => this.stageCharacters().find((character) => character.isActive) ?? null
  );

  readonly diceCommand = computed(() => {
    if (!this.currentIsDiceCommand()) return null;
    this.language.currentLang();
    const message = this.currentMessage();
    if (!message) return null;
    return { name: readableMessageName(message, this.t) };
  });

  readonly systemSpeaker = computed(() => {
    const message = this.currentMessage();
    if (!message) return null;
    const visible = this.systemAvatar.isVisible();
    const speakerVisible = this.systemAvatar.isSpeakerVisible();
    if (message.isDicebot) {
      const roller = this.findDiceRoller(message);
      const rollerImageUrl = roller?.imageUrl ?? '';
      const speakerUrl = rollerImageUrl.length > 0 ? rollerImageUrl : this.playerImageUrl(message);
      const speaks = speakerVisible && speakerUrl.length > 0;
      return {
        kind: 'dice' as SystemAvatarKind,
        imageUrl: speaks ? speakerUrl : visible ? this.systemAvatar.diceUrl() : '',
        isSpeaker: speaks,
        rollerName: roller?.name ?? '',
        rollerImageUrl,
      };
    }
    if (message.isSystemMessage || message.isSystem) {
      return {
        kind: 'system' as SystemAvatarKind,
        imageUrl: visible ? this.systemAvatar.systemUrl() : '',
        isSpeaker: false,
        rollerName: '',
        rollerImageUrl: '',
      };
    }
    return null;
  });

  protected onSystemAvatarContextMenu(event: Event, kind: SystemAvatarKind): void {
    this.systemAvatarMenu.openContextMenu(event, kind);
  }

  private playerImageUrl(message: ChatMessage): string {
    this.objectChange.collectionOf('PeerCursor')();
    const userId = message.originFrom || message.from;
    if (!userId) return '';
    return PeerCursor.findByUserId(userId)?.image?.url ?? '';
  }

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

  readonly speechVisible = computed(
    () =>
      this.currentMessage() != null && !this.systemSpeaker() && !this.narrationKind() && !this.currentIsDiceCommand()
  );

  readonly bubbleAnchor = computed(() => {
    if (!this.speechVisible() || this.settings.layout() !== 'bubble') return null;
    const active = this.activeStageCharacter();
    if (active) return { left: Math.min(83, Math.max(17, active.left)), bottom: '58vh' };
    return { left: 50, bottom: '22vh' };
  });

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

  readonly speakClass = computed(() => {
    if (this.settings.reduceMotion()) return '';
    return this.currentIndex() % 2 === 0 ? 'animate-vn-speak-a' : 'animate-vn-speak-b';
  });

  readonly portraitAnimationClass = computed(() => {
    if (this.settings.reduceMotion()) return '';
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

  /**
   * A method rather than a computed: it hands back the same instance every time, so a computed
   * of it would compare equal and whatever read it would never hear about a change.
   */
  private speakerCharacter(): GameCharacter | null {
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return null;
    this.objectChange.versionOf(object.identifier)();
    return object;
  }

  readonly speakerSlot = computed(() => {
    const character = this.speakerCharacter();
    if (!character) return -1;
    return toPortraitSlot(character.vnPortraitPos) ?? character.portraitPosition ?? 0;
  });

  readonly speakerSlotOverridden = computed(() => {
    const character = this.speakerCharacter();
    return character != null && isVnPortraitPosSet(character.vnPortraitPos);
  });

  protected leftOfSlot = leftOfSlot;
  protected slotBandLeft = slotBandLeft;
  protected slotBandWidth = slotBandWidth;
  protected slotLabelLeftInBand = slotLabelLeftInBand;

  /**
   * Which picture speaks next.
   *
   * The chosen one is the speaker's own, and is not part of what the room shares, so nothing
   * announces that it changed. This counts the changes made here so the bar redraws for them.
   */
  private readonly _portraitTick = signal(0);

  readonly speakerPortrait = computed(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    this._portraitTick();
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return null;
    this.objectChange.versionOf(object.identifier)();
    const children = object.imageDataElement?.children ?? [];
    if (children.length < 1) return null;
    const index = Math.min(Math.max(0, object.selectedPortraitIndex), children.length - 1);
    const element = children[index] as DataElement | undefined;
    const url = this.imageService.getEmptyOr((element?.value as string) ?? '').url;
    return { index, count: children.length, url, name: portraitNameOf(element) };
  });

  /** A picture answers to its name where it was given one, and to its place in the row otherwise. */
  readonly speakerPortraitLabel = computed(() => {
    const portrait = this.speakerPortrait();
    if (!portrait) return '';
    return portrait.name.length > 0 ? portrait.name : `${portrait.index + 1}/${portrait.count}`;
  });

  stepSpeakerPortrait(direction: number): void {
    const object = this.objectStore.get(this._sendFrom());
    if (!(object instanceof GameCharacter)) return;
    const count = object.imageDataElement?.children.length ?? 0;
    const next = object.selectedPortraitIndex + direction;
    if (next < 0 || next >= count) return;
    object.selectedPortraitIndex = next;
    this._portraitTick.update((tick) => tick + 1);
  }

  readonly soundEffects = computed(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('audio-tag')();
    return this.audioStorage.audios.filter((audio) => !audio.isHidden && AudioTag.get(audio.identifier)?.tag === 'SE');
  });

  readonly bgmTracks = computed(() => {
    this.objectChange.fileVersion();
    this.objectChange.collectionOf('audio-tag')();
    return this.audioStorage.audios.filter(
      (audio) => !audio.isHidden && (AudioTag.get(audio.identifier)?.tag ?? 'BGM') === 'BGM'
    );
  });

  readonly playingBgmIdentifier = computed(() => {
    this._seTick();
    const jukebox = this.jukebox;
    return jukebox?.isPlaying ? jukebox.audioIdentifier : '';
  });

  playBgm(identifier: string): void {
    this.jukebox?.play(identifier);
    this._seTick.update((tick) => tick + 1);
  }

  stopBgm(): void {
    this.jukebox?.stop();
    this._seTick.update((tick) => tick + 1);
  }

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
    this.closePopovers();
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

  constructor() {
    this._sendFrom.set(this.gameCharacters()[0]?.identifier ?? '');
    this.playback.attach();
    this.destroyRef.onDestroy(() => this.playback.detach());

    const seTimer = setInterval(() => {
      if (this.isPopover('soundBoard')) this._seTick.update((v) => v + 1);
    }, 500);
    this.destroyRef.onDestroy(() => clearInterval(seTimer));

    effect(() => {
      const characters = this.gameCharacters();
      const current = untracked(() => this._sendFrom());
      const object = untracked(() => this.objectStore.get(current));
      if (object instanceof GameCharacter) return;
      this._sendFrom.set(characters[0]?.identifier ?? '');
    });
    this.paletteRegistry.register(this.paletteHandle);
    this.destroyRef.onDestroy(() => this.paletteRegistry.unregister(this.paletteHandle));
  }

  toggleAutoPlay(): void {
    if (!this.autoPlay()) this.closePopovers();
    this.playback.toggleAutoPlay();
  }

  readonly chatTabOptions = this.playback.availableChatTabs;

  playFromStart(): void {
    this.closePopovers();
    this.playback.playFromStart();
  }

  stopAutoPlay(): void {
    this.playback.stopAutoPlay();
  }

  userAdvance(): void {
    this.director.leaveFollowing();
    this.playback.userAdvance();
  }

  userBack(): void {
    this.director.leaveFollowing();
    this.playback.userBack();
  }

  exit(): void {
    this.vnMode.deactivate();
  }

  advance(): void {
    this.playback.advance();
  }

  back(): void {
    this.playback.back();
  }

  toLatest(): void {
    this.director.leaveFollowing();
    this.playback.toLatest();
  }

  jumpTo(index: number): void {
    this.director.leaveFollowing();
    this.playback.jumpTo(index);
    this.closePopovers();
  }

  isPopover(kind: VisualNovelPopover): boolean {
    return this.openPopover() === kind;
  }

  private closePopovers(): void {
    this.openPopover.set(null);
  }

  private togglePopover(kind: VisualNovelPopover): void {
    this.openPopover.update((current) => (current === kind ? null : kind));
  }

  toggleShortcutHelp(): void {
    this.togglePopover('shortcutHelp');
  }

  toggleBacklog(): void {
    this.togglePopover('backlog');
  }

  toggleEmote(): void {
    this.togglePopover('emote');
  }

  toggleSoundBoard(): void {
    this.togglePopover('soundBoard');
  }

  toggleSlotGuide(): void {
    if (this.speakerSlot() < 0) return;
    this.togglePopover('slotGuide');
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
    const title = sheetPanelTitle(this.t('feature.character.panel.sheet'), object.name);
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
    this.togglePopover('palette');
  }

  pickPaletteLine(line: string): void {
    this.text.set(line);
    this.closePopovers();
  }

  pickSlot(slot: number): void {
    const character = this.speakerCharacter();
    if (character) character.vnPortraitPos = Math.min(VN_STAGE_SLOT_COUNT - 1, Math.max(0, slot));
    this.closePopovers();
  }

  followChatSlot(): void {
    const character = this.speakerCharacter();
    if (character) character.vnPortraitPos = VN_PORTRAIT_POS_UNSET;
    this.closePopovers();
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
    const action = visualNovelKeyDown(event.key, {
      composing: event.isComposing,
      typing: isTypingTarget(event.target),
      popoverOpen: this.openPopover() !== null,
      chord: event.ctrlKey || event.metaKey || event.altKey,
    });
    if (!action) return;
    if (action.preventDefault) event.preventDefault();
    this.runCommand(action.command);
  }

  onKeyup(event: KeyboardEvent): void {
    const action = visualNovelKeyUp(event.key);
    if (action) this.runCommand(action.command);
  }

  private runCommand(command: VisualNovelCommand): void {
    this.commands[command]();
  }

  private readonly commands: Record<VisualNovelCommand, () => void> = {
    advance: () => this.userAdvance(),
    back: () => this.userBack(),
    toStart: () => this.jumpTo(0),
    toLatest: () => this.toLatest(),
    startSkip: () => this.playback.startSkip(),
    stopSkip: () => this.stopSkip(),
    toggleBacklog: () => this.toggleBacklog(),
    toggleAutoPlay: () => this.toggleAutoPlay(),
    toggleSlotGuide: () => this.toggleSlotGuide(),
    toggleShortcutHelp: () => this.toggleShortcutHelp(),
    closePopovers: () => this.closePopovers(),
    exit: () => this.exit(),
  };

  stopSkip(): void {
    this.playback.stopSkip();
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
        exited: this.selectedExit(),
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
    if (this.selectedKind() === 'scene') this.scene.playTransition();
    this.attachedSe.set(null);
    this.text.set('');
    this.playback.followLatest();
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
}
