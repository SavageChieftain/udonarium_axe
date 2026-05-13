import { DataElement, DataElementRole, type DataElementRoleValue } from '@axe/domain/data/data-element';

export type DataElementDropPosition = 'before' | 'after' | 'inside';

/** detail 配下で許される最大階層深度（detail を 0 と数える）。 */
export const MAX_STANDARD_DEPTH = 3;

/** ターゲット要素自身を新しい親として受け入れられるか（FIELD は子を持てない）。 */
export function canDropInside(targetElement: DataElement): boolean {
  return targetElement.fieldRole !== DataElementRole.FIELD;
}

/** 親要素が指定 role の子を受け入れられるかを判定する。 */
export function canAcceptChildRole(parentElement: DataElement, childRole: DataElementRoleValue): boolean {
  if (parentElement.name === 'detail') return childRole === DataElementRole.SECTION;
  if (parentElement.fieldRole === DataElementRole.SECTION) return childRole === DataElementRole.GROUP;
  if (parentElement.fieldRole === DataElementRole.GROUP) {
    if (childRole === DataElementRole.FIELD) return true;
    if (childRole === DataElementRole.GROUP) {
      return getElementDepth(parentElement) < MAX_STANDARD_DEPTH - 1;
    }
  }
  return false;
}

/** detail を基準とした要素の階層深度（detail 自身は 0）。 */
export function getElementDepth(element: DataElement): number {
  let depth = 0;
  let parent = element.parent;
  while (parent instanceof DataElement && parent.name !== 'detail') {
    depth++;
    parent = parent.parent;
  }
  return depth;
}

/** 部分木の高さ（葉までの最大ステップ数）。 */
export function getSubtreeDepth(element: DataElement): number {
  let depth = 0;
  for (const child of element.children) {
    depth = Math.max(depth, getSubtreeDepth(child) + 1);
  }
  return depth;
}

/**
 * ドラッグ中の要素を `targetElement` の指定位置にドロップ可能かを判定する。
 *
 * @param targetDepth ターゲット要素の現在の depth（コンポーネント側で保持しているので渡してもらう）
 */
export function canDropStructureElement(
  draggedElement: DataElement,
  targetElement: DataElement,
  position: DataElementDropPosition,
  targetDepth: number
): boolean {
  if (draggedElement === targetElement) return false;

  const newDepth = position === 'inside' ? targetDepth + 1 : targetDepth;
  if (newDepth + getSubtreeDepth(draggedElement) > MAX_STANDARD_DEPTH) return false;

  if (position === 'inside') {
    return (
      canDropInside(targetElement) &&
      canAcceptChildRole(targetElement, draggedElement.fieldRole) &&
      !draggedElement.contains(targetElement)
    );
  }

  const parent = targetElement.parent;
  return (
    parent instanceof DataElement &&
    canAcceptChildRole(parent, draggedElement.fieldRole) &&
    !draggedElement.contains(parent)
  );
}

/** ホスト要素のジオメトリと cursor 位置からドロップ位置 (before / inside / after) を決定する。 */
export function resolveDropPosition(
  hostRect: { top: number; height: number } | null,
  clientY: number,
  targetElement: DataElement
): DataElementDropPosition {
  if (!hostRect || hostRect.height <= 0) return canDropInside(targetElement) ? 'inside' : 'after';

  const edgeSize = Math.min(12, hostRect.height * 0.28);
  const offsetY = clientY - hostRect.top;
  if (offsetY <= edgeSize) return 'before';
  if (offsetY >= hostRect.height - edgeSize) return 'after';
  return canDropInside(targetElement) ? 'inside' : 'after';
}
