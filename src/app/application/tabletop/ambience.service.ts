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

/** The weather over the whole map. */
export interface WeatherAmbience {
  kind: AmbienceKind;
  color: string;
  density: number;
}

const PERSISTENT_SOURCE = 'ambience';

/**
 * Ambient effects on the board: weather over the whole map, and ground effects within a marked area.
 *
 * Both belong to the table, so switching maps switches them too.
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
   * Whether the particles may move.
   * Reduced motion stops them, but the swamp and lava washes stay.
   */
  readonly motionEnabled = computed<boolean>(() => !prefersReducedMotion());

  readonly now = computed<number>(() => this.playbackService.now());

  constructor() {
    // The draw loop runs for as long as an ambience exists; unlike a cast, it never ends.
    effect(() => {
      const active = this.areas().length > 0 || this.weather() != null;
      this.playbackService.setPersistent(PERSISTENT_SOURCE, active && this.motionEnabled());
    });
  }
}
