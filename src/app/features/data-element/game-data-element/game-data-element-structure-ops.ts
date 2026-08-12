import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementRole,
} from '@axe/domain/data/data-element';
import type { DataElementDropPosition } from '@axe/features/data-element/game-data-element/game-data-element-structure-drop';

/**
 * 項目の並びを組み替える。
 *
 * 置けるかどうかの判断は `-structure-drop` が持つ。ここは**動かす・作る**だけ。
 * 名前は兄弟と重ならないように付け直す（同じ名前が並ぶと、参照がどちらを指すか決まらない）。
 */

/** 新しく作る項目の既定の名前。画面の言葉に合わせるので、呼ぶ側が渡す。 */
export interface NewElementNames {
  field: string;
  group: string;
}

export interface StructureMove {
  newParent: DataElement;
  oldParent: DataElement | null;
}

/**
 * 掴んだ項目を、置き先へ移す。
 *
 * 動かせなかったときは null。動かせたときは、知らせるべき親を返す。
 */
export function moveStructureElement(
  dragged: DataElement,
  target: DataElement,
  position: DataElementDropPosition
): StructureMove | null {
  const oldParent = dragged.parent instanceof DataElement ? dragged.parent : null;

  if (position === 'inside') {
    target.appendChild(dragged);
    finishMove(dragged);
    return { newParent: target, oldParent };
  }

  const parent = target.parent;
  if (!(parent instanceof DataElement)) return null;

  if (position === 'before') parent.insertBefore(dragged, target);
  else insertElementAfter(dragged, target, parent);

  finishMove(dragged);
  return { newParent: parent, oldParent };
}

/** 置き先の次の兄弟の前へ入れる。次が無ければ末尾へ。 */
export function insertElementAfter(element: DataElement, target: DataElement, parent: DataElement): void {
  const index = parent.children.indexOf(target);
  const next = parent.children[index + 1];
  if (next) parent.insertBefore(element, next);
  else parent.appendChild(element);
}

/** 値を持つ項目を 1 つ作る。 */
export function createFieldElement(
  parent: DataElement,
  names: NewElementNames,
  reservedNames: Set<string> = new Set()
): DataElement {
  const uniqueName = DataElement.createUniqueSiblingName(parent, names.field, '', reservedNames);
  reservedNames.add(uniqueName);

  return DataElement.create(uniqueName, '', {
    [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
    [DataElementAttribute.ROLE]: DataElementRole.FIELD,
  });
}

/**
 * 項目を束ねる入れ物を 1 つ作る。
 *
 * 空の入れ物は画面上で掴みどころが無いので、中身を 1 つ入れた状態で返す。
 */
export function createContainerElement(
  role: typeof DataElementRole.SECTION | typeof DataElementRole.GROUP,
  parent: DataElement,
  names: NewElementNames,
  reservedNames: Set<string> = new Set()
): DataElement {
  const uniqueName = DataElement.createUniqueSiblingName(parent, names.group, '', reservedNames);
  reservedNames.add(uniqueName);

  const container = DataElement.create(uniqueName, '', { [DataElementAttribute.ROLE]: role });
  container.appendChild(
    role === DataElementRole.SECTION
      ? createContainerElement(DataElementRole.GROUP, container, names)
      : createFieldElement(container, names)
  );
  return container;
}

function finishMove(element: DataElement): void {
  element.syncFieldRoleToHierarchy();
  element.update();
}
