import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/application/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { buildSurfaceSwitchContextMenu } from '@axe/application/ui/surface-switch-context-menu';
import { buildCopyAction, buildLockToggleAction } from '@axe/application/ui/tabletop-context-menu-actions';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { CharacterSheetTarget } from '@axe/domain/tabletop/character-sheet-target';
import { TableSurface, TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { buildDisclosureContextMenu } from '@axe/features/disclosure/disclosure-context-menu';
import {
  buildObjectRow,
  matchesObjectRowQuery,
  OBJECT_LIST_TYPES,
  ObjectRow,
} from '@axe/features/gm-object-list/game-object-list-row';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

type DisclosableArg = Parameters<typeof buildDisclosureContextMenu>[0];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-object-list-panel',
  templateUrl: './game-object-list-panel.component.html',
  host: { class: 'block h-full' },
  imports: [FormsModule, TranslocoModule, SafePipe],
})
export class GameObjectListPanelComponent {
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly tabletopService = inject(TabletopService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  protected readonly t = inject(TRANSLATE_FN);

  protected readonly types = OBJECT_LIST_TYPES;
  private readonly typeByKey = new Map(OBJECT_LIST_TYPES.map((type) => [type.key, type]));
  protected readonly search = signal('');
  protected readonly enabledTypes = signal<ReadonlySet<string>>(new Set(OBJECT_LIST_TYPES.map((type) => type.key)));
  protected readonly editingId = signal<string | null>(null);

  private readonly surfaceLabelKeys: Record<TableSurface, string> = {
    floor: 'feature.tabletop.contextMenu.surfaceFloor',
    'north-wall': 'feature.tabletop.contextMenu.surfaceNorthWall',
    'east-wall': 'feature.tabletop.contextMenu.surfaceEastWall',
    'south-wall': 'feature.tabletop.contextMenu.surfaceSouthWall',
    'west-wall': 'feature.tabletop.contextMenu.surfaceWestWall',
  };

  protected readonly availableSurfaces = computed<TableSurface[]>(() => {
    const table = this.tabletopService.currentTableVersion();
    const result: TableSurface[] = ['floor'];
    if (table.showNorthWall) result.push('north-wall');
    if (table.showEastWall) result.push('east-wall');
    if (table.showSouthWall) result.push('south-wall');
    if (table.showWestWall) result.push('west-wall');
    return result;
  });

  protected readonly isGameMaster = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  });

  protected readonly rows = computed<ObjectRow[]>(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    const result: ObjectRow[] = [];
    for (const type of OBJECT_LIST_TYPES) {
      this.objectChange.collectionOf(type.alias)();
      for (const object of this.objectStore.getObjects<TabletopObject>(type.alias)) {
        this.objectChange.versionOf(object.identifier)();
        result.push(buildObjectRow(object, type.key, (peerId) => PeerCursor.findByPeerId(peerId)?.name ?? null));
      }
    }
    return result;
  });

  protected readonly filteredRows = computed<ObjectRow[]>(() => {
    const query = this.search();
    const enabled = this.enabledTypes();
    return this.rows().filter((row) => enabled.has(row.typeKey) && matchesObjectRowQuery(row, query));
  });

  constructor() {
    queueMicrotask(() => (this.panelService.title = this.t('common.panel.objectList')));
  }

  protected typeIcon(key: string): string {
    return this.typeByKey.get(key)?.icon ?? 'help_outline';
  }

  protected surfaceLabelKey(surface: string): string {
    return this.surfaceLabelKeys[surface as TableSurface] ?? '';
  }

  protected isEditing(id: string): boolean {
    return this.editingId() === id;
  }

  protected toggleEdit(id: string): void {
    this.editingId.update((current) => (current === id ? null : id));
  }

  protected setSurface(object: TabletopObject, surface: string): void {
    const location = object.location;
    object.location = {
      name: location.name,
      x: location.x,
      y: location.y,
      surface: surface === 'floor' ? undefined : (surface as TableSurface),
    };
  }

  protected setCoord(object: TabletopObject, axis: 'x' | 'y', value: number): void {
    const location = object.location;
    const next = Number(value);
    object.location = {
      name: location.name,
      x: axis === 'x' ? next : location.x,
      y: axis === 'y' ? next : location.y,
      surface: location.surface,
    };
  }

  protected isTypeEnabled(key: string): boolean {
    return this.enabledTypes().has(key);
  }

  protected toggleType(key: string): void {
    const next = new Set(this.enabledTypes());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.enabledTypes.set(next);
  }

  protected onRowClick(row: ObjectRow): void {
    if (row.locationKind === 'table') this.focusRow(row);
  }

  protected openRowMenu(event: MouseEvent, row: ObjectRow): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuService.open(this.pointerDeviceService.pointers[0], this.buildRowMenu(row), row.name);
  }

  private focusRow(row: ObjectRow): void {
    this.selectionSignalService.focusToCoordinate(row.object.location.x, row.object.location.y);
  }

  private openDetail(object: TabletopObject): void {
    const option: PanelOption = { width: 700, height: 600, left: 100 };
    this.panelService.openLazy(
      () =>
        import('@axe/features/character/game-character-sheet/game-character-sheet.component').then(
          (m) => m.GameCharacterSheetComponent
        ),
      option,
      (component) => (component.tabletopObject = object as CharacterSheetTarget)
    );
  }

  private moveTo(object: TabletopObject, destination: string): void {
    if (destination === 'table') object.location.surface = undefined;
    object.setLocation(destination);
  }

  private buildRowMenu(row: ObjectRow): ContextMenuAction[] {
    const object = row.object;
    const gridSize = this.tabletopService.gridSize();
    const actions: ContextMenuAction[] = [];

    if (row.locationKind === 'table') {
      actions.push({ name: this.t('feature.gmObjectList.menu.focus'), action: () => this.focusRow(row) });
    }
    actions.push({ name: this.t('feature.gmObjectList.menu.detail'), action: () => this.openDetail(object) });

    actions.push(ContextMenuSeparator, {
      name: this.t('feature.gmObjectList.menu.move'),
      subActions: [
        { name: this.t('feature.gmObjectList.menu.moveTable'), action: () => this.moveTo(object, 'table') },
        { name: this.t('feature.gmObjectList.menu.moveCommon'), action: () => this.moveTo(object, 'common') },
        { name: this.t('feature.gmObjectList.menu.moveGraveyard'), action: () => this.moveTo(object, 'graveyard') },
      ],
    });
    actions.push(...buildSurfaceSwitchContextMenu(object, this.tabletopService.currentTable, this.t));

    actions.push(
      ContextMenuSeparator,
      buildLockToggleAction(this.isLocked(object), (next) => this.setLocked(object, next), this.t),
      buildCopyAction(object, gridSize, this.t)
    );

    if (row.disclosable) {
      actions.push(...buildDisclosureContextMenu(object as unknown as DisclosableArg, this.t));
    }

    actions.push(ContextMenuSeparator, {
      name: this.t('feature.gmObjectList.menu.delete'),
      action: () => object.destroy(),
    });
    return actions;
  }

  private isLocked(object: TabletopObject): boolean {
    if ('isLocked' in object) return Boolean((object as { isLocked: boolean }).isLocked);
    if ('isLock' in object) return Boolean((object as { isLock: boolean }).isLock);
    return false;
  }

  private setLocked(object: TabletopObject, next: boolean): void {
    if ('isLocked' in object) (object as { isLocked: boolean }).isLocked = next;
    else if ('isLock' in object) (object as { isLock: boolean }).isLock = next;
  }
}
