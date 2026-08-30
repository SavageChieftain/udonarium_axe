import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '@axe/application/i18n/language.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { isVnPortraitPosSet, VN_PORTRAIT_POS_UNSET } from '@axe/domain/visual-novel/vn-portrait-position';
import {
  buildVnEmoteSuffix,
  parseVnEmote,
  splitVnEmoteSuffix,
  VN_BUBBLE_ANIMATIONS,
  VN_BUBBLE_SHAPES,
  VN_EMOTION_MARK_CHARS,
  VN_EMOTION_MARKS,
  VN_PORTRAIT_EMOTES,
  VnBubbleAnimation,
  VnBubbleShape,
  VnEmotionMark,
  VnMessageKind,
  VnPortraitEmote,
} from '@axe/features/visual-novel/visual-novel-emote';
import { readableMessageName, readableMessageText } from '@axe/features/visual-novel/visual-novel-message';
import { VisualNovelPlaybackService } from '@axe/features/visual-novel/visual-novel-playback.service';
import { VN_STAGE_SLOT_COUNT } from '@axe/features/visual-novel/visual-novel-stage';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

const BACKLOG_PAGE_SIZE = 200;

export interface VnBacklogEntry {
  message: ChatMessage;
  index: number;
  /** Read in the reader's language, which matters for what the room says of itself. */
  name: string;
  text: string;
  suffix: string;
  imageUrl: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'visual-novel-backlog',
  templateUrl: './visual-novel-backlog.component.html',
  host: { class: 'contents' },
  imports: [DatePipe, DraggableDirective, FormsModule, SafePipe, TranslocoModule],
})
export class VisualNovelBacklogComponent {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly imageService = inject(ImageService);
  private readonly translate = inject(TRANSLATE_FN);
  private readonly language = inject(LanguageService);
  private readonly playback = inject(VisualNovelPlaybackService);

  readonly messageKindOptions = input.required<readonly VnMessageKind[]>();

  readonly jump = output<number>();
  readonly closed = output<void>();

  readonly bubbleShapeOptions = VN_BUBBLE_SHAPES;
  readonly bubbleAnimationOptions = VN_BUBBLE_ANIMATIONS;
  readonly portraitEmoteOptions = VN_PORTRAIT_EMOTES;
  readonly emotionMarkOptions = VN_EMOTION_MARKS;
  readonly slotIndexes = Array.from({ length: VN_STAGE_SLOT_COUNT }, (_, i) => i);

  readonly currentIndex = this.playback.currentIndex;

  readonly filter = signal('');

  readonly editingIndex = signal(-1);
  readonly editText = signal('');
  readonly editKind = signal<VnMessageKind>('normal');
  readonly editShape = signal<VnBubbleShape>('normal');
  readonly editBubbleAnimation = signal<VnBubbleAnimation>('none');
  readonly editPortraitEmote = signal<VnPortraitEmote>('none');
  readonly editEmotionMark = signal<VnEmotionMark>('none');
  readonly editFlipped = signal(false);
  readonly editExited = signal(false);
  readonly editSlot = signal(-1);

  private readonly listElement = viewChild<ElementRef<HTMLDivElement>>('backlogList');

  readonly entries = computed<VnBacklogEntry[]>(() => {
    this.objectChange.fileVersion();
    this.language.currentLang();
    return this.playback.messages().map((message, index) => {
      const { text, suffix } = splitVnEmoteSuffix(readableMessageText(message, this.translate));
      const hasPortrait = !message.isSystemMessage && !message.isDicebot;
      return {
        message,
        index,
        name: readableMessageName(message, this.translate),
        text,
        suffix,
        imageUrl: hasPortrait ? this.imageService.getEmptyOr(message.imageIdentifier).url : '',
      };
    });
  });

  readonly onlyMine = signal(false);
  readonly onlyEmote = signal(false);

  readonly filteredEntries = computed(() => {
    const keyword = this.filter().trim().toLowerCase();
    const onlyMine = this.onlyMine();
    const onlyEmote = this.onlyEmote();
    return this.entries().filter((entry) => {
      if (onlyMine && !entry.message.isSendFromSelf) return false;
      if (onlyEmote && entry.suffix.length < 1) return false;
      if (keyword.length < 1) return true;
      return entry.text.toLowerCase().includes(keyword) || entry.name.toLowerCase().includes(keyword);
    });
  });

  toggleOnlyMine(): void {
    this.onlyMine.update((only) => !only);
  }

  toggleOnlyEmote(): void {
    this.onlyEmote.update((only) => !only);
  }

  scrollToCurrent(): void {
    const list = this.listElement()?.nativeElement;
    const row = list?.querySelector<HTMLElement>(`[data-vn-log-index="${this.currentIndex()}"]`);
    row?.scrollIntoView({ block: 'center' });
  }

  readonly visibleCount = signal(BACKLOG_PAGE_SIZE);

  readonly windowedEntries = computed(() => {
    const entries = this.filteredEntries();
    const count = this.visibleCount();
    if (entries.length <= count) return entries;
    let start = entries.length - count;
    const position = entries.findIndex((entry) => entry.index === this.currentIndex());
    if (position >= 0 && position < start) start = position;
    return entries.slice(start);
  });

  readonly hiddenCount = computed(() => this.filteredEntries().length - this.windowedEntries().length);

  loadMoreEntries(): void {
    this.visibleCount.update((count) => count + BACKLOG_PAGE_SIZE);
  }

  constructor() {
    effect(() => {
      const list = this.listElement()?.nativeElement;
      if (!list) return;
      const row = list.querySelector<HTMLElement>(`[data-vn-log-index="${this.currentIndex()}"]`);
      if (row) {
        row.scrollIntoView({ block: 'center' });
      } else {
        list.scrollTop = list.scrollHeight;
      }
    });
  }

  emotionMarkLabel(mark: VnEmotionMark): string {
    return mark === 'none' ? '' : VN_EMOTION_MARK_CHARS[mark];
  }

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
    this.editExited.set(parsed.exited);
    const pos = entry.message.vnPortraitPos;
    this.editSlot.set(isVnPortraitPosSet(pos) ? pos : VN_PORTRAIT_POS_UNSET);
    this.editingIndex.set(entry.index);
  }

  cancelEditEntry(): void {
    this.editingIndex.set(-1);
  }

  saveEditEntry(): void {
    const message = this.playback.messages()[this.editingIndex()];
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
        exited: this.editExited(),
      });
    if (message.text !== next) {
      message.text = next;
      message.fixd = true;
    }
    if (message.vnPortraitPos !== this.editSlot()) {
      message.vnPortraitPos = this.editSlot();
    }
    this.editingIndex.set(-1);
  }
}
