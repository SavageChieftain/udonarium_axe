import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { buildCopyAction, buildLockToggleAction } from '@axe/application/ui/tabletop-context-menu-actions';
import { GROUND_AMBIENCE_KINDS } from '@axe/domain/effect/ambience/ambience-kind';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';

/** 濃さの段。細かく刻んでも見た目が変わらないので 3 段だけ出す。 */
const DENSITY_STEPS: readonly { labelKey: string; value: number }[] = [
  { labelKey: 'feature.ambience.densityThin', value: 0.3 },
  { labelKey: 'feature.ambience.densityNormal', value: 0.6 },
  { labelKey: 'feature.ambience.densityThick', value: 1 },
];

const SIZE_STEPS: readonly number[] = [2, 4, 6, 10, 16, 24];

export function buildTableAmbienceContextMenu(
  ambience: TableAmbience,
  gridSize: number,
  onEdit: () => void,
  t: TranslateFn
): ContextMenuAction[] {
  const menu: ContextMenuAction[] = [];

  menu.push({ name: t('feature.ambience.contextMenu.settings'), action: () => onEdit() });

  menu.push({
    name: t('feature.ambience.contextMenu.kind'),
    action: undefined,
    subActions: GROUND_AMBIENCE_KINDS.map((kind) => ({
      name: (ambience.kind === kind ? '✔ ' : '') + t(`feature.ambience.kind.${kind}`),
      action: () => {
        ambience.ambienceKind = kind;
        SoundEffect.play(PresetSound.sweep);
      },
    })),
  });

  menu.push({
    name: t('feature.ambience.contextMenu.density'),
    action: undefined,
    subActions: DENSITY_STEPS.map((step) => ({
      name: (Math.abs(ambience.density - step.value) < 0.05 ? '✔ ' : '') + t(step.labelKey),
      action: () => {
        ambience.ambienceDensity = step.value;
        SoundEffect.play(PresetSound.sweep);
      },
    })),
  });

  menu.push({
    name: t('feature.ambience.contextMenu.size'),
    action: undefined,
    subActions: SIZE_STEPS.map((size) => ({
      name: (ambience.width === size && ambience.height === size ? '✔ ' : '') + `${size} × ${size}`,
      action: () => {
        resize(ambience, size, gridSize);
        SoundEffect.play(PresetSound.sweep);
      },
    })),
  });

  menu.push(buildLockToggleAction(ambience.isLock, (next) => (ambience.isLock = next), t));

  menu.push(ContextMenuSeparator);
  menu.push(
    buildCopyAction(ambience, gridSize, t, {
      sound: PresetSound.cardPut,
      afterClone: (clone) => (clone.isLock = false),
    })
  );
  menu.push({
    name: t('feature.tabletop.contextMenu.delete'),
    action: () => {
      ambience.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });

  return menu;
}

/** 大きさを変えても中心が動かないよう、増えたぶんだけ左上へ寄せる。 */
function resize(ambience: TableAmbience, size: number, gridSize: number): void {
  const shiftX = ((ambience.width - size) * gridSize) / 2;
  const shiftY = ((ambience.height - size) * gridSize) / 2;
  ambience.width = size;
  ambience.height = size;
  ambience.location.x += shiftX;
  ambience.location.y += shiftY;
  ambience.update();
}
