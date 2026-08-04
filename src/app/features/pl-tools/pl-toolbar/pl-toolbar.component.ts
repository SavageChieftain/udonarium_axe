import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { getRangeMenuItems } from '@axe/application/tabletop/tabletop-action-helpers';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { HandRailService } from '@axe/features/card/hand-rail/hand-rail.service';
import { ConnectionQualityComponent } from '@axe/features/lobby/connection-quality/connection-quality.component';
import { ActiveCharacterService } from '@axe/features/pl-tools/active-character.service';
import { CharacterPanelService } from '@axe/features/pl-tools/character-panel.service';
import { OwnedCharacterListPanelComponent } from '@axe/features/pl-tools/owned-character-list/owned-character-list-panel.component';
import { isOwnedByUser } from '@axe/features/pl-tools/owned-character-list/owned-characters';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { buildTurnIndicator } from '@axe/ui/turn/turn-indicator';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pl-toolbar',
  templateUrl: './pl-toolbar.component.html',
  imports: [ConnectionQualityComponent, DraggableDirective, SafePipe, TranslocoModule],
})
export class PlToolbarComponent {
  protected readonly isCompact = inject(ViewportService).isCompact;
  private readonly panelService = inject(PanelService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectStore = inject(ObjectStore);
  private readonly characterPanel = inject(CharacterPanelService);
  private readonly turnOrder = inject(TurnOrderService);
  private readonly tabletopAction = inject(TabletopActionService);
  protected readonly handRail = inject(HandRailService);
  protected readonly widgets = inject(WidgetVisibilityService);
  protected readonly active = inject(ActiveCharacterService);
  private readonly t = inject(TRANSLATE_FN);

  protected readonly rangeMenuItems = getRangeMenuItems();
  protected readonly rangeOpen = signal(false);

  private readonly barRef = viewChild<ElementRef<HTMLElement>>('bar');
  private savedLeft: string | null = null;
  private savedTop: string | null = null;

  readonly isPlayer = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.myRole === PeerRole.Player;
  });

  readonly activeCharacter = computed<GameCharacter | null>(() => {
    const identifier = this.active.identifier();
    if (!identifier) return null;
    this.objectChange.collectionOf(GameCharacter.aliasName)();
    this.objectChange.versionOf(identifier)();
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    const character = this.objectStore.get(identifier);
    if (!(character instanceof GameCharacter)) return null;
    return isOwnedByUser(character, PeerCursor.myCursor?.userId ?? '') ? character : null;
  });

  readonly turnIndicator = computed(() => {
    this.objectChange.versionOf('TurnState')();
    const currentIdentifier = this.turnOrder.currentIdentifier;
    if (currentIdentifier) this.objectChange.versionOf(currentIdentifier)();
    const current = currentIdentifier ? this.objectStore.get(currentIdentifier) : null;
    const name = current instanceof GameCharacter ? current.name : '';
    return buildTurnIndicator(this.turnOrder.phase, this.turnOrder.round, name);
  });

  protected activeImageUrl(): string {
    return this.activeCharacter()?.imageFile?.url ?? '';
  }

  protected openActiveChatPalette(): void {
    const character = this.activeCharacter();
    if (character) this.characterPanel.openChatPalette(character);
  }

  protected toggleHandRail(): void {
    this.handRail.toggle();
  }

  protected toggleRangeMenu(): void {
    if (!this.activeCharacter()) {
      this.rangeOpen.set(false);
      this.openOwnedCharacterList();
      return;
    }
    this.rangeOpen.update((open) => !open);
  }

  protected createRange(typeName: string): void {
    const character = this.activeCharacter();
    this.rangeOpen.set(false);
    if (!character) return;
    const range = this.tabletopAction.createRangeArea(
      { x: character.location.x, y: character.location.y, z: character.posZ },
      typeName
    );
    range.followingCharctorIdentifier = character.identifier;
    range.following();
    SoundEffect.play(PresetSound.dicePut);
  }

  constructor() {
    effect((onCleanup) => {
      const el = this.barRef()?.nativeElement;
      if (!el) return;
      if (this.savedLeft !== null && this.savedTop !== null) {
        el.style.left = this.savedLeft;
        el.style.top = this.savedTop;
      } else {
        el.style.left = `${Math.max(8, (window.innerWidth - el.offsetWidth) / 2)}px`;
        el.style.top = '8px';
      }
      onCleanup(() => {
        this.savedLeft = el.style.left;
        this.savedTop = el.style.top;
      });
    });
  }

  protected openOwnedCharacterList(): void {
    this.panelService.open(OwnedCharacterListPanelComponent, {
      width: 420,
      height: 560,
      left: 100,
      top: 40,
      title: this.t('common.panel.ownedCharacters'),
    });
  }
}
