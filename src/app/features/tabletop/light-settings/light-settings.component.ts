import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import {
  applyLightPreset,
  LightAnimation,
  LightCategory,
  LightConfig,
  LightPreset,
  VisionType,
} from '@axe/domain/tabletop/vision-types';
import { TranslocoModule } from '@jsverse/transloco';

type LightTarget = LightConfig & { update?: () => void };

@Component({
  selector: 'light-settings',
  templateUrl: './light-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoModule],
})
export class LightSettingsComponent {
  private readonly t = inject(TRANSLATE_FN);

  target: LightTarget | null = null;
  advanced = false;
  showVision = false;

  readonly presets = Object.values(LightPreset);
  readonly animations = Object.values(LightAnimation);
  readonly categories = Object.values(LightCategory);
  readonly visionTypes = Object.values(VisionType);

  onPreset(preset: string): void {
    if (!this.target) return;
    applyLightPreset(this.target, preset as LightPreset);
    this.target.lightEnabled = true;
    this.target.update?.();
  }

  presetLabel(value: string): string {
    return this.t('feature.light.preset.' + value);
  }
  animationLabel(value: string): string {
    return this.t('feature.light.animation.' + value);
  }
  categoryLabel(value: string): string {
    return this.t('feature.light.category.' + value);
  }
  visionLabel(value: string): string {
    return this.t('feature.vision.type.' + value);
  }
}
