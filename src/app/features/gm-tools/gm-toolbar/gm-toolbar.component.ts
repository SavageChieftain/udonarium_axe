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
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { findOrphanedOwnership } from '@axe/domain/tabletop/ownership';
import { BuffManagerPanelComponent } from '@axe/features/buff/buff-manager-panel/buff-manager-panel.component';
import { HandRailService } from '@axe/features/card/hand-rail/hand-rail.service';
import { EffectLibraryPanelComponent } from '@axe/features/effect/effect-library-panel/effect-library-panel.component';
import { GameObjectListPanelComponent } from '@axe/features/gm-object-list/game-object-list-panel.component';
import { NpcBarComponent } from '@axe/features/gm-tools/npc-bar/npc-bar.component';
import { NpcBarService } from '@axe/features/gm-tools/npc-bar/npc-bar.service';
import { NpcDragService } from '@axe/features/gm-tools/npc-bar/npc-drag.service';
import { PartyListPanelComponent } from '@axe/features/gm-tools/party-list/party-list-panel.component';
import { MapEditorPanelComponent } from '@axe/features/map-editor/editor/map-editor-panel.component';
import { DungeonGeneratorComponent } from '@axe/features/tabletop/dungeon-generator/dungeon-generator.component';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { turnIndicatorSignal } from '@axe/ui/turn/turn-indicator.signal';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gm-toolbar',
  templateUrl: './gm-toolbar.component.html',
  imports: [DraggableDirective, NpcBarComponent, TranslocoModule],
})
export class GmToolbarComponent {
  protected readonly isCompact = inject(ViewportService).isCompact;
  protected readonly npcBar = inject(NpcBarService);
  protected readonly drag = inject(NpcDragService);
  private readonly panelService = inject(PanelService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly tabletopService = inject(TabletopService);
  private readonly visionService = inject(VisionService);
  private readonly objectStore = inject(ObjectStore);
  private readonly turnOrder = inject(TurnOrderService);
  protected readonly handRail = inject(HandRailService);
  protected readonly widgets = inject(WidgetVisibilityService);
  private readonly t = inject(TRANSLATE_FN);

  private readonly barRef = viewChild<ElementRef<HTMLElement>>('bar');
  private savedLeft: string | null = null;
  private savedTop: string | null = null;

  protected readonly personaOpen = signal(false);

  readonly isGameMaster = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });

  protected readonly personas = computed<PeerCursor[]>(() => {
    this.objectChange.collectionOf('PeerCursor')();
    return this.objectStore.getObjects<PeerCursor>(PeerCursor).filter((cursor) => !cursor.isGameMaster);
  });

  protected readonly currentPersona = computed<PeerCursor | null>(() => {
    const userId = this.visionService.previewAsUserId();
    if (!userId) return null;
    return this.personas().find((cursor) => cursor.userId === userId) ?? null;
  });

  readonly turnIndicator = turnIndicatorSignal();

  protected turnPrev(): void {
    this.turnOrder.prev();
  }

  protected turnNext(): void {
    this.turnOrder.next();
  }

  protected toggleHandRail(): void {
    this.handRail.toggle();
  }

  protected readonly darknessEnabled = computed(() => {
    const table = this.tabletopService.currentTable;
    this.objectChange.versionOf(table.identifier)();
    return table.darknessEnabled;
  });

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

  protected openObjectList(): void {
    this.panelService.open(GameObjectListPanelComponent, {
      width: 460,
      height: 620,
      left: 100,
      top: 40,
      title: this.t('common.panel.objectList'),
    });
  }

  protected openPartyList(): void {
    this.panelService.open(PartyListPanelComponent, {
      width: 460,
      height: 620,
      left: 120,
      top: 60,
      title: this.t('feature.gmTools.party.title'),
    });
  }

  protected openBuffManager(): void {
    this.panelService.open(BuffManagerPanelComponent, {
      width: 560,
      height: 420,
      left: 160,
      top: 100,
      title: this.t('feature.buffManager.title'),
    });
  }

  protected openEffectLibrary(): void {
    this.panelService.open(EffectLibraryPanelComponent, {
      width: 360,
      height: 480,
      left: 140,
      top: 80,
      title: this.t('feature.effect.panelTitle'),
    });
  }

  protected openMapEditor(): void {
    this.panelService.open(MapEditorPanelComponent, {
      width: 1100,
      height: 740,
      left: 80,
      top: 60,
      title: this.t('feature.mapEditor.title'),
    });
  }

  protected openDungeonGenerator(): void {
    this.panelService.open(DungeonGeneratorComponent, {
      width: 460,
      height: 660,
      minWidth: 400,
      minHeight: 520,
      left: 100,
      top: 60,
      title: this.t('feature.tabletop.dungeonGenerator.title'),
    });
  }

  protected toggleNpcBar(): void {
    this.npcBar.toggle();
  }

  protected toggleDarkness(): void {
    const table = this.tabletopService.currentTable;
    table.darknessEnabled = !table.darknessEnabled;
    table.update();
    this.objectChange.notifyChanged(table.identifier);
  }

  protected releaseOrphanedOwnership(): void {
    const orphaned = findOrphanedOwnership(this.objectStore.getObjects());
    if (orphaned.length === 0) return;
    if (!confirm(this.t('app.fab.releaseOwnershipConfirm', { count: orphaned.length }))) return;
    for (const object of orphaned) object.owner = '';
  }

  protected togglePersona(): void {
    this.personaOpen.update((open) => !open);
  }

  protected selectPersona(userId: string | null): void {
    this.visionService.previewAsUserId.set(userId);
    this.personaOpen.set(false);
  }
}
