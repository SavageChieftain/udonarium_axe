import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export interface MultiSelectionContextDeps {
  readonly t: TranslateFn;
  readonly selectionSignalService: SelectionSignalService;
  readonly gridSize: number;
}

export function buildMultiSelectionContextMenu(
  objects: readonly TabletopObject[],
  deps: MultiSelectionContextDeps
): ContextMenuAction[] {
  const { t, selectionSignalService, gridSize } = deps;
  const count = objects.length;
  const movable = objects.filter((o) => !(o as unknown as { isLock?: boolean }).isLock);
  const supportsClone = (obj: TabletopObject): obj is TabletopObject & { clone(): TabletopObject } =>
    typeof (obj as unknown as { clone?: () => unknown }).clone === 'function';

  return [
    {
      name: t('feature.tabletop.selection.countLabel', { count }),
      action: undefined,
    },
    ContextMenuSeparator,
    {
      name: t('feature.tabletop.selection.copyAll'),
      action: () => {
        const cloned: string[] = [];
        for (const obj of movable) {
          if (!supportsClone(obj)) continue;
          const copy = obj.clone();
          if ('location' in copy && copy.location) {
            copy.location.x += gridSize;
            copy.location.y += gridSize;
          }
          if (typeof (copy as unknown as { update?: () => void }).update === 'function') {
            (copy as unknown as { update: () => void }).update();
          }
          cloned.push(copy.identifier);
        }
        if (cloned.length > 0) selectionSignalService.replaceSelection(cloned);
      },
    },
    {
      name: t('feature.tabletop.selection.moveAllGraveyard'),
      action: () => {
        for (const obj of movable) {
          if (typeof (obj as unknown as { setLocation?: (n: string) => void }).setLocation !== 'function') continue;
          (obj as unknown as { setLocation: (n: string) => void }).setLocation('graveyard');
        }
        selectionSignalService.clearSelection();
      },
    },
    ContextMenuSeparator,
    {
      name: t('feature.tabletop.selection.clear'),
      action: () => selectionSignalService.clearSelection(),
    },
  ];
}

export interface TryBuildMultiSelectionContextMenuOptions {
  readonly self: TabletopObject;
  readonly selectionSignalService: SelectionSignalService;
  readonly objectStore: ObjectStore;
  readonly t: TranslateFn;
  readonly gridSize: number;
}

export function tryBuildMultiSelectionContextMenu(
  options: TryBuildMultiSelectionContextMenuOptions
): ContextMenuAction[] | null {
  const { self, selectionSignalService, objectStore, t, gridSize } = options;
  if (selectionSignalService.selectionSize() <= 1) return null;
  const selected = selectionSignalService.selectedObjects();
  if (!selected.has(self.identifier)) return null;
  const objects: TabletopObject[] = [];
  for (const id of selected) {
    const obj = objectStore.get<TabletopObject>(id);
    if (obj) objects.push(obj);
  }
  if (objects.length <= 1) return null;
  return buildMultiSelectionContextMenu(objects, { t, selectionSignalService, gridSize });
}
