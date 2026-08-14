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

/** 入 / 切 を入れ替えるだけの項目。名札のほかは同じ振る舞いになる。 */
export function buildToggleAction(
  isOn: boolean,
  setOn: (next: boolean) => void,
  labels: { on: string; off: string },
  onChanged?: () => void
): ContextMenuAction {
  return {
    name: isOn ? labels.on : labels.off,
    action: () => {
      setOn(!isOn);
      SoundEffect.play(PresetSound.sweep);
      onChanged?.();
    },
  };
}

export interface AltitudeActionOptions {
  /** 高さだけ戻して、盤面からの浮きは触らない。 */
  keepPosZ?: boolean;
  onChanged?: () => void;
  /** 影の出し入れなど、この物だけに要る項目。 */
  extraActions?: ContextMenuAction[];
}

/** 高さの扱いは駒でも地形でも同じ。0 に戻すか、数値を出すかの 2 つ。 */
export function buildAltitudeAction(
  target: TabletopObject,
  t: TranslateFn,
  options: AltitudeActionOptions = {}
): ContextMenuAction {
  return {
    name: t('feature.tabletop.contextMenu.altitudeSetting'),
    action: undefined,
    subActions: [
      {
        name: t('feature.tabletop.contextMenu.altitudeZero'),
        action: () => {
          if (target.altitude === 0 && (options.keepPosZ || target.posZ === 0)) return;
          target.altitude = 0;
          if (!options.keepPosZ) target.posZ = 0;
          SoundEffect.play(PresetSound.sweep);
        },
        altitudeHandle: target,
      },
      buildToggleAction(
        target.isAltitudeIndicate,
        (next) => (target.isAltitudeIndicate = next),
        {
          on: t('feature.tabletop.contextMenu.altitudeShowOn'),
          off: t('feature.tabletop.contextMenu.altitudeShowOff'),
        },
        options.onChanged
      ),
      ...(options.extraActions ?? []),
    ],
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
