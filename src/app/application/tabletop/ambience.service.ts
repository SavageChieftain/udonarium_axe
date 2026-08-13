import { computed, effect, inject, Injectable } from '@angular/core';
import { EffectPlaybackService, prefersReducedMotion } from '@axe/application/effect/effect-playback.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import {
  ambienceColorOf,
  ambienceDensityOf,
  type AmbienceKind,
  isAmbienceKind,
} from '@axe/domain/effect/ambience/ambience-kind';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';

/** マップ全体に掛かっている天候。 */
export interface WeatherAmbience {
  kind: AmbienceKind;
  color: string;
  density: number;
}

const PERSISTENT_SOURCE = 'ambience';

/**
 * 盤面の環境演出。マップ全体の天候と、範囲を区切って置いた地表の演出。
 *
 * どちらもテーブルに紐づくので、マップを切り替えると一緒に切り替わる。
 */
@Injectable({ providedIn: 'root' })
export class AmbienceService {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly tabletopService = inject(TabletopService);
  private readonly playbackService = inject(EffectPlaybackService);

  readonly areas = computed<TableAmbience[]>(() => {
    this.objectChange.collectionOf(TableAmbience.aliasName)();
    const areas = this.tabletopService.ambiences;
    for (const area of areas) this.objectChange.versionOf(area.identifier)();
    return areas;
  });

  readonly weather = computed<WeatherAmbience | null>(() => {
    const table = this.tabletopService.currentTableVersion();
    if (!isAmbienceKind(table.weatherKind)) return null;
    return {
      kind: table.weatherKind,
      color: ambienceColorOf(table.weatherKind, table.weatherColor),
      density: ambienceDensityOf(table.weatherDensity),
    };
  });

  /**
   * 粒を動かしてよいか。
   * 「視差効果を減らす」設定では止めるが、沼や溶岩の塗りまでは消さない。
   */
  readonly motionEnabled = computed<boolean>(() => !prefersReducedMotion());

  readonly now = computed<number>(() => this.playbackService.now());

  constructor() {
    // 環境演出がある間は描画のループを止めない。発動と違って終わりが来ない。
    effect(() => {
      const active = this.areas().length > 0 || this.weather() != null;
      this.playbackService.setPersistent(PERSISTENT_SOURCE, active && this.motionEnabled());
    });
  }
}
