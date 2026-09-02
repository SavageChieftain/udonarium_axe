import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import {
  applyVisionShape,
  asVisionShape,
  MutableVisionFields,
  VISION_SHAPES,
  VisionShape,
} from '@axe/domain/tabletop/vision-shape';
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
  /** Off for a reader setting sight alone, where a lamp is nothing to do with what was asked. */
  showLight = true;

  readonly presets = Object.values(LightPreset);
  readonly animations = Object.values(LightAnimation);
  readonly categories = Object.values(LightCategory);
  readonly visionTypes = Object.values(VisionType);
  readonly visionShapes = VISION_SHAPES;
  readonly VisionShape = VisionShape;

  onPreset(preset: string): void {
    if (!this.target) return;
    applyLightPreset(this.target, preset as LightPreset);
    this.target.lightEnabled = true;
    this.target.update?.();
  }

  onVisionShape(shape: string): void {
    if (!this.target) return;
    applyVisionShape(this.target as unknown as MutableVisionFields, asVisionShape(shape));
    this.target.update?.();
  }

  get visionShape(): VisionShape {
    return asVisionShape(this.target?.visionShape);
  }

  shapeLabel(value: string): string {
    return this.t('feature.vision.settings.shape' + value.replace(/(^|-)(.)/g, (_, __, c: string) => c.toUpperCase()));
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
