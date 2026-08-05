import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

export interface EffectLibraryMenuCallbacks {
  onEdit: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onInsertToken: () => void;
  onPlaceField: () => void;
  onRemove: () => void;
}

/** エフェクト集のタイルを右クリックしたときの操作。 */
export function buildEffectLibraryContextMenu(
  preset: EffectPreset,
  callbacks: EffectLibraryMenuCallbacks,
  t: TranslateFn
): ContextMenuAction[] {
  return [
    { name: t('feature.effect.preview'), action: () => callbacks.onPreview() },
    { name: t('feature.effect.insertToken'), action: () => callbacks.onInsertToken() },
    { name: t('feature.effect.placeField'), action: () => callbacks.onPlaceField() },
    ContextMenuSeparator,
    { name: t('feature.effect.editPreset'), action: () => callbacks.onEdit() },
    { name: t('feature.effect.duplicatePreset'), action: () => callbacks.onDuplicate() },
    ContextMenuSeparator,
    { name: t('feature.effect.removePreset', { name: preset.name }), action: () => callbacks.onRemove() },
  ];
}
