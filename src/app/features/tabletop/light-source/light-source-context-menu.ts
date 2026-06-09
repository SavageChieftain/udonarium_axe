import { TranslateFn } from '@axe/application/i18n/translate.token';
import { ContextMenuAction, ContextMenuSeparator } from '@axe/application/ui/context-menu.service';
import { buildLockToggleAction } from '@axe/application/ui/tabletop-context-menu-actions';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { LightSource } from '@axe/domain/tabletop/light-source';
import { applyLightPreset, LightPreset } from '@axe/domain/tabletop/vision-types';

const PRESET_LABEL_KEYS: Record<LightPreset, string> = {
  [LightPreset.CUSTOM]: 'feature.light.preset.custom',
  [LightPreset.TORCH]: 'feature.light.preset.torch',
  [LightPreset.LANTERN]: 'feature.light.preset.lantern',
  [LightPreset.CANDLE]: 'feature.light.preset.candle',
  [LightPreset.DAYLIGHT]: 'feature.light.preset.daylight',
  [LightPreset.FLASHLIGHT]: 'feature.light.preset.flashlight',
  [LightPreset.NEON]: 'feature.light.preset.neon',
  [LightPreset.SPOTLIGHT]: 'feature.light.preset.spotlight',
};

export function buildLightSourceContextMenu(
  light: LightSource,
  gridSize: number,
  characters: readonly { identifier: string; name: string }[],
  onEdit: (light: LightSource) => void,
  t: TranslateFn
): ContextMenuAction[] {
  const menu: ContextMenuAction[] = [];

  menu.push({
    name: t('feature.light.contextMenu.settings'),
    action: () => onEdit(light),
  });

  menu.push({
    name: t('feature.light.contextMenu.follow'),
    action: undefined,
    subActions: [
      {
        name: (light.followingCharacterIdentifier === '' ? '✔ ' : '') + t('feature.light.contextMenu.unfollow'),
        action: () => {
          light.followingCharacterIdentifier = '';
          SoundEffect.play(PresetSound.unlock);
        },
      },
      ...characters.map((character) => ({
        name: (light.followingCharacterIdentifier === character.identifier ? '✔ ' : '') + character.name,
        action: () => {
          light.followingCharacterIdentifier = character.identifier;
          light.following();
          SoundEffect.play(PresetSound.sweep);
        },
      })),
    ],
  });

  menu.push({
    name: light.lightEnabled ? t('feature.light.contextMenu.turnOff') : t('feature.light.contextMenu.turnOn'),
    action: () => {
      light.lightEnabled = !light.lightEnabled;
      SoundEffect.play(PresetSound.sweep);
    },
  });

  menu.push({
    name: t('feature.light.contextMenu.preset'),
    action: undefined,
    subActions: Object.values(LightPreset).map((preset) => ({
      name: (light.lightPreset === preset ? '✔ ' : '') + t(PRESET_LABEL_KEYS[preset]),
      action: () => {
        applyLightPreset(light, preset);
        light.lightEnabled = true;
        SoundEffect.play(PresetSound.sweep);
      },
    })),
  });

  menu.push({
    name: t('feature.tabletop.contextMenu.altitudeSetting'),
    action: undefined,
    subActions: [
      {
        name: t('feature.tabletop.contextMenu.altitudeZero'),
        action: () => {
          if (light.altitude !== 0 || light.posZ !== 0) {
            light.altitude = 0;
            light.posZ = 0;
            SoundEffect.play(PresetSound.sweep);
          }
        },
        altitudeHande: light,
      },
      light.isAltitudeIndicate
        ? {
            name: t('feature.tabletop.contextMenu.altitudeShowOn'),
            action: () => {
              light.isAltitudeIndicate = false;
              SoundEffect.play(PresetSound.sweep);
            },
          }
        : {
            name: t('feature.tabletop.contextMenu.altitudeShowOff'),
            action: () => {
              light.isAltitudeIndicate = true;
              SoundEffect.play(PresetSound.sweep);
            },
          },
    ],
  });

  menu.push(buildLockToggleAction(light.isLock, (next) => (light.isLock = next), t));

  menu.push(ContextMenuSeparator);
  menu.push({
    name: t('feature.tabletop.contextMenu.copy'),
    action: () => {
      const clone = light.clone();
      clone.location.x += gridSize;
      clone.location.y += gridSize;
      clone.isLock = false;
      SoundEffect.play(PresetSound.cardPut);
    },
  });
  menu.push({
    name: t('feature.tabletop.contextMenu.delete'),
    action: () => {
      light.destroy();
      SoundEffect.play(PresetSound.sweep);
    },
  });

  return menu;
}
