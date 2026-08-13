import { computed, effect, inject, Injectable } from '@angular/core';
import { EffectPlaybackService, prefersReducedMotion } from '@axe/application/effect/effect-playback.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectCast } from '@axe/domain/effect/effect-cast';
import { EffectField } from '@axe/domain/effect/effect-field';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

/** 場として置かれた演出の 1 コマぶん。 */
export interface EffectFieldRenderable {
  key: string;
  preset: EffectPreset;
  cast: EffectCast;
  elapsed: number;
}

/**
 * 置きっぱなしの演出（毒沼・炎の壁）。
 *
 * 発動と同じプリセットを、尺で折り返しながら繰り返し再生する。
 * 盤面のオブジェクトなので、同室の全員に見えて部屋データにも残る。
 */
@Injectable({ providedIn: 'root' })
export class EffectFieldService {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly tabletopService = inject(TabletopService);
  private readonly playbackService = inject(EffectPlaybackService);

  readonly fields = computed<EffectField[]>(() => {
    this.objectChange.collectionOf('effect-field')();
    const fields = this.objectStore.getObjects<EffectField>(EffectField);
    for (const field of fields) this.objectChange.versionOf(field.identifier)();
    return fields;
  });

  constructor() {
    // 場がある間は描画のループを止めない。発動と違って終わりが来ない。
    effect(() => this.playbackService.setPersistent('effect-field', this.fields().length > 0));
  }

  place(preset: EffectPreset, x: number, y: number, z: number): EffectField {
    const field = new EffectField();
    field.presetIdentifier = preset.identifier;
    field.location.name = 'table';
    field.location.x = x;
    field.location.y = y;
    field.posZ = z;
    field.initialize();
    return field;
  }

  remove(field: EffectField): void {
    field.destroy();
  }

  removeAll(): void {
    for (const field of this.fields()) field.destroy();
  }

  presetOf(field: EffectField): EffectPreset | null {
    const preset = this.objectStore.get<EffectPreset>(field.presetIdentifier);
    return preset instanceof EffectPreset ? preset : null;
  }

  /** 描画用の 1 コマ。尺で折り返して繰り返す。 */
  renderables(now: number): EffectFieldRenderable[] {
    // 発動と同じく、視差効果を減らす設定では描かない。場は消えないので特に効く。
    if (prefersReducedMotion()) return [];

    const gridSize = this.tabletopService.gridSize();
    const renderables: EffectFieldRenderable[] = [];

    for (const field of this.fields()) {
      const preset = this.presetOf(field);
      if (!preset || !field.isVisibleOnTable) continue;

      const half = (gridSize * (field.size > 0 ? field.size : 1)) / 2;
      renderables.push({
        key: `field-${field.identifier}`,
        preset,
        cast: {
          presetIdentifier: preset.identifier,
          casterIdentifier: '',
          origin: null,
          targets: [
            { identifier: field.identifier, x: field.location.x + half, y: field.location.y + half, z: field.posZ },
          ],
          seed: field.phaseOffset,
        },
        elapsed: (now + field.phaseOffset) % preset.duration,
      });
    }
    return renderables;
  }
}
