import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { getMyPeerId } from '@axe/core/network/peer-context-source';
import { GameCharacter } from '@axe/domain/character/game-character';
import {
  convertLegacyCheckTableElements,
  countConvertibleCheckTableElements,
} from '@axe/domain/data/check-table-converter';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { clampInRange, floatOr, roundOr } from '@axe/features/character/game-character-sheet/numeric-input-helpers';

/**
 * キャラクターシートの「設定タブ」専用のサブコンポーネント。
 * インベントリ / コマ / ポップアップ / データ移行の各設定パネルを担当する。
 *
 * GameCharacterSheetComponent から切り出した理由:
 * - 1063 行の親 HTML から ~220 行を分離して責務を明確化
 * - 設定タブ固有のミューテータ（chkKomaSize / onChkAltitude / characterPieceSignals 等）
 *   を子に集約することで、親はシート表示と種別ごとの編集 UI に専念できる
 */
@Component({
  selector: 'game-character-settings-tab',
  templateUrl: './game-character-settings-tab.component.html',
  host: { class: 'block' },
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCharacterSettingsTabComponent {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly pointerDeviceService = inject(PointerDeviceService);

  readonly character = input.required<GameCharacter>();

  /** location 名（例: 'table'）の変更要求を親へ通知。
   *  set 自体は親が tabletopObject.setLocation 経由で行う（他の object 型でも共通の経路）。 */
  readonly locationChange = output<string>();

  /** 自分の peerId（インベントリの「個人」option 値）。 */
  readonly myPeerId = getMyPeerId();

  readonly characterPieceSignals = computed(() => {
    const char = this.character();
    this.objectChange.versionOf(char.identifier)();
    return {
      roll: char.roll,
      rotate: char.rotate,
      locationX: char.location.x,
      locationY: char.location.y,
    };
  });

  readonly legacyCheckTableCount = computed(() => {
    const char = this.character();
    this.objectChange.versionOf(char.identifier)();
    if (!char.detailDataElement) return 0;
    return countConvertibleCheckTableElements(char.detailDataElement);
  });

  setSpecifyKomaImageFlag(value: boolean): void {
    const character = this.character();
    character.specifyKomaImageFlag = value;
    this.objectChange.notifyChanged(character.identifier);
  }

  chkKomaSize(height: number): void {
    const character = this.character();
    character.komaImageHeight = clampInRange(Number(height), 50, 750, character.komaImageHeight);
    this.objectChange.notifyChanged(character.identifier);
    this.pointerDeviceService.isDragging = false;
  }

  onChkKomaSize(event: Event): void {
    this.chkKomaSize((event.target as HTMLInputElement).valueAsNumber);
  }

  onChkAltitude(event: Event): void {
    const character = this.character();
    character.altitude = roundOr((event.target as HTMLInputElement).valueAsNumber, 0);
  }

  onChkRotate(event: Event): void {
    const character = this.character();
    character.rotate = floatOr((event.target as HTMLInputElement).valueAsNumber, 0);
  }

  resetRotate(): void {
    const character = this.character();
    character.rotate = 0;
    SoundEffect.play(PresetSound.sweep);
  }

  onChkRoll(event: Event): void {
    const character = this.character();
    character.roll = floatOr((event.target as HTMLInputElement).valueAsNumber, 0);
  }

  resetRoll(): void {
    const character = this.character();
    character.roll = 0;
    SoundEffect.play(PresetSound.sweep);
  }

  onChkPopWidth(event: Event): void {
    const character = this.character();
    character.overViewWidth = clampInRange(
      (event.target as HTMLInputElement).valueAsNumber,
      270,
      800,
      character.overViewWidth
    );
  }

  onChkPopMaxHeight(event: Event): void {
    const character = this.character();
    character.overViewMaxHeight = clampInRange(
      (event.target as HTMLInputElement).valueAsNumber,
      250,
      1000,
      character.overViewMaxHeight
    );
  }

  onSetLocation(event: Event): void {
    this.locationChange.emit((event.target as HTMLSelectElement).value);
  }

  convertLegacyCheckTables(): void {
    const char = this.character();
    if (!char.detailDataElement) return;
    const convertedCount = convertLegacyCheckTableElements(char.detailDataElement);
    if (convertedCount < 1) return;
    this.objectChange.notifyChanged(char.detailDataElement.identifier);
    char.update();
  }
}
