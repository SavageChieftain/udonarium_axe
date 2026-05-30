import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction } from '@axe/application/ui/context-menu.service';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export function buildLockToggleAction(
  isLocked: boolean,
  setLocked: (next: boolean) => void,
  t: TranslateFn
): ContextMenuAction {
  return isLocked
    ? {
        name: t('feature.tabletop.contextMenu.unlock'),
        action: () => {
          setLocked(false);
          SoundEffect.play(PresetSound.unlock);
        },
      }
    : {
        name: t('feature.tabletop.contextMenu.lock'),
        action: () => {
          setLocked(true);
          SoundEffect.play(PresetSound.lock);
        },
      };
}

export interface CopyActionOptions<T extends TabletopObject> {
  readonly sound?: string;
  readonly afterClone?: (clone: T) => void;
}

export function buildCopyAction<T extends TabletopObject>(
  obj: T,
  gridSize: number,
  t: TranslateFn,
  options: CopyActionOptions<T> = {}
): ContextMenuAction {
  const { sound = PresetSound.piecePut, afterClone } = options;
  return {
    name: t('feature.tabletop.contextMenu.copy'),
    action: () => {
      const copy = obj.clone();
      copy.location.x += gridSize;
      copy.location.y += gridSize;
      afterClone?.(copy);
      copy.update();
      SoundEffect.play(sound);
    },
  };
}
