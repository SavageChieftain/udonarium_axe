import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { GameObjectListPanelComponent } from '@axe/features/gm-object-list/game-object-list-panel.component';
import { NpcBarComponent } from '@axe/features/gm-tools/npc-bar/npc-bar.component';
import { NpcBarService } from '@axe/features/gm-tools/npc-bar/npc-bar.service';
import { NpcDragService } from '@axe/features/gm-tools/npc-bar/npc-drag.service';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gm-toolbar',
  templateUrl: './gm-toolbar.component.html',
  imports: [DraggableDirective, NpcBarComponent, TranslocoModule],
})
export class GmToolbarComponent {
  protected readonly npcBar = inject(NpcBarService);
  protected readonly drag = inject(NpcDragService);
  private readonly panelService = inject(PanelService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly tabletopService = inject(TabletopService);
  private readonly t = inject(TRANSLATE_FN);

  private readonly barRef = viewChild<ElementRef<HTMLElement>>('bar');
  private positioned = false;

  readonly isGameMaster = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });

  protected readonly darknessEnabled = computed(() => {
    const table = this.tabletopService.currentTable;
    this.objectChange.versionOf(table.identifier)();
    return table.darknessEnabled;
  });

  constructor() {
    effect(() => {
      const el = this.barRef()?.nativeElement;
      if (el && !this.positioned) {
        this.positioned = true;
        el.style.left = `${Math.max(8, (window.innerWidth - el.offsetWidth) / 2)}px`;
        el.style.top = '8px';
      }
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

  protected toggleNpcBar(): void {
    this.npcBar.toggle();
  }

  protected toggleDarkness(): void {
    const table = this.tabletopService.currentTable;
    table.darknessEnabled = !table.darknessEnabled;
    table.update();
    this.objectChange.notifyChanged(table.identifier);
  }
}
