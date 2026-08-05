import { computed, inject, Injectable } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import {
  applyEffectPresetSeed,
  createEffectPreset,
  DEFAULT_EFFECT_PRESET_SEEDS,
} from '@axe/domain/effect/builtin-effect-presets';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { duplicatedEffectName } from '@axe/domain/effect/effect-preset-form';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';

@Injectable({ providedIn: 'root' })
export class EffectLibraryService {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);

  readonly presets = computed<EffectPreset[]>(() => {
    this.objectChange.collectionOf('effect-preset')();
    const presets = this.objectStore.getObjects<EffectPreset>(EffectPreset);
    for (const preset of presets) this.objectChange.versionOf(preset.identifier)();
    return presets;
  });

  get(identifier: string): EffectPreset | null {
    const preset = this.objectStore.get<EffectPreset>(identifier);
    return preset instanceof EffectPreset ? preset : null;
  }

  /**
   * 名前で引く。チャット記法とキャラクターシートは名前で演出を指すため。
   * GM 専用は一覧に出さないだけでなく、名前を知っていても PL からは引けないようにする。
   */
  findByName(name: string): EffectPreset | null {
    const needle = name.trim();
    if (needle.length < 1) return null;
    const found = this.presets().find((preset) => preset.name.trim() === needle);
    if (!found) return null;
    return found.gmOnly && !PeerCursor.isMyselfGameMaster ? null : found;
  }

  /** 白紙から 1 つ作る。 */
  create(name: string): EffectPreset {
    const preset = new EffectPreset();
    preset.name = name;
    preset.initialize();
    return preset;
  }

  /** 丸ごと複製する。既定を壊さずに手を入れたいときの入口。 */
  duplicate(source: EffectPreset): EffectPreset {
    const preset = source.clone();
    preset.name = duplicatedEffectName(
      source.name,
      this.presets().map((existing) => existing.name)
    );
    preset.initialize();
    return preset;
  }

  remove(preset: EffectPreset): void {
    preset.destroy();
  }

  /**
   * 既定を今の内容へ揃える。
   * 足りないものを作るだけでなく、既にあるものへも値を入れ直す。
   * 固定 identifier のプリセットは入室時に作り直せないため、既存の部屋は
   * 更新しないと古い尺や色のまま取り残される。
   */
  restoreDefaults(): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

    for (const seed of DEFAULT_EFFECT_PRESET_SEEDS) {
      const existing = this.get(seed.identifier);
      if (existing) {
        applyEffectPresetSeed(existing, seed);
        existing.update();
        updated++;
        continue;
      }

      // 消された identifier は再利用できないので、その場合だけ新しい id で作る。
      createEffectPreset(seed, seed.identifier);
      if (!this.get(seed.identifier)) createEffectPreset(seed);
      added++;
    }
    return { added, updated };
  }
}
