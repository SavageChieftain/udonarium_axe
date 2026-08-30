import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';

export interface HotbarSlotMenuCallbacks {
  onEdit: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onClear?: () => void;
}

export interface HotbarBarMenuCallbacks {
  onToggleLabel: () => void;
  onToggleHint: () => void;
  onTogglePin: () => void;
  onResetPlace: () => void;
  onLoad: () => void;
  onUndo?: () => void;
  onUndoRead?: () => void;
  onHide: () => void;
}

export function buildHotbarSlotContextMenu(
  isFilled: boolean,
  callbacks: HotbarSlotMenuCallbacks,
  t: TranslateFn
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [
    { name: t(isFilled ? 'feature.hotbar.menu.edit' : 'feature.hotbar.menu.fill'), action: () => callbacks.onEdit() },
  ];
  if (isFilled && callbacks.onCopy) {
    actions.push({ name: t('feature.hotbar.menu.copy'), action: () => callbacks.onCopy?.() });
  }
  if (callbacks.onPaste) {
    actions.push({ name: t('feature.hotbar.menu.paste'), action: () => callbacks.onPaste?.() });
  }
  if (isFilled && callbacks.onClear) {
    actions.push(ContextMenuSeparator);
    actions.push({ name: t('feature.hotbar.menu.clear'), action: () => callbacks.onClear?.() });
  }
  return actions;
}

export function buildHotbarBarContextMenu(
  state: { showsLabel: boolean; showsHint: boolean; pinned: boolean },
  callbacks: HotbarBarMenuCallbacks,
  t: TranslateFn
): ContextMenuAction[] {
  const actions: ContextMenuAction[] = [
    {
      name: (state.showsLabel ? '✔ ' : '') + t('feature.hotbar.menu.showLabel'),
      action: () => callbacks.onToggleLabel(),
    },
    {
      name: (state.showsHint ? '✔ ' : '') + t('feature.hotbar.menu.showHint'),
      action: () => callbacks.onToggleHint(),
    },
    { name: (state.pinned ? '✔ ' : '') + t('feature.hotbar.pin'), action: () => callbacks.onTogglePin() },
    { name: t('feature.hotbar.menu.resetPlace'), action: () => callbacks.onResetPlace() },
  ];
  actions.push(ContextMenuSeparator);
  actions.push({ name: t('feature.hotbar.menu.load'), action: () => callbacks.onLoad() });
  if (callbacks.onUndo || callbacks.onUndoRead) {
    actions.push(ContextMenuSeparator);
  }
  if (callbacks.onUndo) {
    actions.push({ name: t('feature.hotbar.menu.undo'), action: () => callbacks.onUndo?.() });
  }
  if (callbacks.onUndoRead) {
    actions.push({ name: t('feature.hotbar.menu.undoRead'), action: () => callbacks.onUndoRead?.() });
  }
  actions.push(ContextMenuSeparator);
  actions.push({ name: t('feature.hotbar.menu.hide'), action: () => callbacks.onHide() });
  return actions;
}
