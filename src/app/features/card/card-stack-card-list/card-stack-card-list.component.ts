import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { sheetPanelTitle } from '@axe/application/ui/sheet-panel';
import { callShuffleCardStack } from '@axe/core/event/domain-events';
import { Network } from '@axe/core/index';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import {
  formatTrumpCardCode,
  parseTrumpCardCode,
  TrumpCardLabel,
} from '@axe/features/card/card-stack-card-list/trump-card-label';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { TooltipDirective } from '@axe/ui/directives/tooltip.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'card-stack-card-list',
  templateUrl: './card-stack-card-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TooltipDirective, SafePipe, TranslocoModule],
})
export class CardStackCardListComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TRANSLATE_FN);

  readonly cardStack = input.required<CardStack>();

  private readonly owner = Network.peerContext.userId;
  private currentlyOwned: CardStack | null = null;

  readonly cards = computed<readonly Card[]>(() => {
    const stack = this.cardStack();
    this.objectChange.versionOf(stack.identifier)();
    return stack.cards;
  });

  constructor() {
    effect(() => {
      const stack = this.cardStack();
      untracked(() => this.claimOwnership(stack));
    });

    this.objectChange.onObjectChangedFor(
      () => [this.cardStack().identifier],
      () => {
        const stack = this.cardStack();
        if (stack.owner && stack.owner !== this.owner) {
          this.panelService.close();
        }
      },
      this.destroyRef
    );
    this.objectChange.objectDeleted$.subscribe((e) => {
      if (this.cardStack().identifier === e.identifier) {
        this.panelService.close();
      }
    }, this.destroyRef);
    this.destroyRef.onDestroy(() => this.releaseOwnership());
  }

  private claimOwnership(stack: CardStack): void {
    if (this.currentlyOwned && this.currentlyOwned !== stack && this.currentlyOwned.owner === this.owner) {
      this.currentlyOwned.owner = '';
    }
    stack.owner = this.owner;
    this.currentlyOwned = stack;
  }

  private releaseOwnership(): void {
    if (this.currentlyOwned && this.currentlyOwned.owner === this.owner) {
      this.currentlyOwned.owner = '';
    }
    this.currentlyOwned = null;
  }

  shuffle(): void {
    const stack = this.cardStack();
    stack.shuffle();
    callShuffleCardStack(stack.identifier);
    SoundEffect.play(PresetSound.cardShuffle);
  }

  drawCard(card: Card): void {
    const stack = this.cardStack();
    card.parent?.removeChild(card);
    card.location.x = stack.location.x + 100 + Math.random() * 50;
    card.location.y = stack.location.y + 25 + Math.random() * 50;
    card.location.name = stack.location.name;
    card.rotate += stack.rotate;
    if (360 < card.rotate) card.rotate -= 360;
    card.toTopmost();
    SoundEffect.play(PresetSound.cardDraw);
  }

  showDetail(card: Card): void {
    const coordinate = { x: this.panelService.left, y: this.panelService.top };
    const title = sheetPanelTitle(this.t('feature.card.settingTitle'), card.name);
    const option: PanelOption = {
      title,
      left: coordinate.x + 20,
      top: coordinate.y + 30,
      width: 600,
      height: 600,
    };
    this.panelService.openLazy(
      () =>
        import('@axe/features/character/game-character-sheet/game-character-sheet.component').then(
          (m) => m.GameCharacterSheetComponent
        ),
      option,
      (component) => (component.tabletopObject = card)
    );
  }

  trackByCard(_index: number, card: Card): string {
    return card.identifier;
  }

  readonly draggedCardId = signal<string | null>(null);
  readonly dragOverCardId = signal<string | null>(null);
  readonly dropPosition = signal<'before' | 'after' | null>(null);

  private activePointerId: number | null = null;

  isDragging(card: Card): boolean {
    return this.draggedCardId() === card.identifier;
  }

  isDropBefore(card: Card): boolean {
    return (
      this.dragOverCardId() === card.identifier &&
      this.dropPosition() === 'before' &&
      this.draggedCardId() !== null &&
      this.draggedCardId() !== card.identifier
    );
  }

  isDropAfter(card: Card): boolean {
    return (
      this.dragOverCardId() === card.identifier &&
      this.dropPosition() === 'after' &&
      this.draggedCardId() !== null &&
      this.draggedCardId() !== card.identifier
    );
  }

  onPointerDown(event: PointerEvent, card: Card): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    this.activePointerId = event.pointerId;
    this.draggedCardId.set(card.identifier);
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) return;
    const draggedId = this.draggedCardId();
    if (!draggedId) return;

    const found = this.findCardRowUnderPointer(event.clientX, event.clientY);
    if (!found || found.id === draggedId) {
      this.dragOverCardId.set(null);
      this.dropPosition.set(null);
      return;
    }
    const isAfter = event.clientY > found.rect.top + found.rect.height / 2;
    this.dragOverCardId.set(found.id);
    this.dropPosition.set(isAfter ? 'after' : 'before');
  }

  onPointerUp(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) return;
    const draggedId = this.draggedCardId();
    const overId = this.dragOverCardId();
    const position = this.dropPosition();

    this.resetDragState();
    try {
      (event.currentTarget as Element).releasePointerCapture(event.pointerId);
    } catch {
      // pointer capture may have been released already
    }

    if (!draggedId || !overId || draggedId === overId || !position) return;
    this.performReorder(draggedId, overId, position);
  }

  onPointerCancel(event: PointerEvent): void {
    if (this.activePointerId !== event.pointerId) return;
    this.resetDragState();
  }

  private resetDragState(): void {
    this.activePointerId = null;
    this.draggedCardId.set(null);
    this.dragOverCardId.set(null);
    this.dropPosition.set(null);
  }

  private findCardRowUnderPointer(x: number, y: number): { id: string; rect: DOMRect } | null {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;
      const row = el.closest<HTMLElement>('[data-card-id]');
      if (row) {
        const id = row.dataset['cardId'];
        if (id) return { id, rect: row.getBoundingClientRect() };
      }
    }
    return null;
  }

  private performReorder(draggedId: string, overId: string, position: 'before' | 'after'): void {
    const stack = this.cardStack();
    const dragged = stack.cards.find((c) => c.identifier === draggedId);
    const target = stack.cards.find((c) => c.identifier === overId);
    if (!dragged || !target || !target.parent || dragged.parent !== target.parent) return;

    if (position === 'before') {
      target.parent.insertBefore(dragged, target);
      return;
    }

    const siblings = target.parent.children;
    const nextSibling = siblings[siblings.indexOf(target) + 1];
    if (nextSibling && nextSibling !== dragged) {
      target.parent.insertBefore(dragged, nextSibling);
    } else {
      target.parent.appendChild(dragged);
    }
  }

  cardName(card: Card): string {
    this.objectChange.versionOf(card.identifier)();
    return card.name;
  }

  setCardName(card: Card, event: Event): void {
    card.name = (event.target as HTMLInputElement).value;
  }

  setImage(card: Card, slot: 'front' | 'back'): void {
    this.modalService.open<string>(FileSelecterComponent).then((value) => {
      if (value == null) return;
      const el = card.imageDataElement?.getFirstElementByName(slot);
      if (!el) return;
      el.value = value;
    });
  }

  private cardImageBasename(card: Card): string {
    this.objectChange.versionOf(card.identifier)();
    this.objectChange.fileVersion();
    const front = card.imageDataElement?.getFirstElementByName('front');
    const url = (card.frontImage?.url || (front?.value as string)) ?? '';
    const slash = url.lastIndexOf('/');
    const filename = slash >= 0 ? url.substring(slash + 1) : url;
    const dot = filename.lastIndexOf('.');
    return dot > 0 ? filename.substring(0, dot) : filename;
  }

  cardImageHint(card: Card): string {
    const basename = this.cardImageBasename(card);
    return formatTrumpCardCode(basename) ?? basename;
  }

  trumpLabel(card: Card): TrumpCardLabel | null {
    return parseTrumpCardCode(this.cardImageBasename(card));
  }
}
