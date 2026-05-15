import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';

export function canReorderDetailElement(
  char: GameCharacter | null,
  objectStore: ObjectStore,
  draggedId: string,
  targetId: string
): boolean {
  if (!char?.detailDataElement || draggedId === targetId) return false;
  const draggedEl = objectStore.get<DataElement>(draggedId);
  const targetEl = char.detailDataElement.children.find((e) => e.identifier === targetId);
  if (!draggedEl || !targetEl) return false;
  return !draggedEl.contains(char.detailDataElement);
}

export function reorderDetailElement(
  char: GameCharacter | null,
  objectStore: ObjectStore,
  objectChange: ObjectChangeService,
  draggedId: string,
  targetId: string
): void {
  if (!char?.detailDataElement) return;
  const draggedEl = objectStore.get<DataElement>(draggedId);
  const targetEl = char.detailDataElement.children.find((e) => e.identifier === targetId);
  if (!draggedEl || !targetEl) return;
  const oldParent = draggedEl.parent as DataElement | null;
  char.detailDataElement.insertBefore(draggedEl, targetEl);
  draggedEl.syncFieldRoleToHierarchy();
  oldParent?.update();
  char.detailDataElement.update();
  objectChange.notifyChanged(draggedEl.identifier);
  if (oldParent) objectChange.notifyChanged(oldParent.identifier);
  objectChange.notifyChanged(char.detailDataElement.identifier);
  char.update();
}
