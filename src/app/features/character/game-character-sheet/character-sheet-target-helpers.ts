import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { CharacterSheetTarget } from '@axe/domain/tabletop/character-sheet-target';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';

/**
 * GameCharacterSheetComponent の `clone()` 操作。
 * 種別ごとの状態リセット（owner / lock 解除）とサウンドエフェクトを集約する。
 *
 * @param source 複製元の tabletop object
 * @param offsetPx クローンを元の位置から x/y にずらす量（既定 50px）
 */
export function cloneTabletopObject(source: CharacterSheetTarget, offsetPx = 50): void {
  const cloneObject = source.clone();
  cloneObject.location.x += offsetPx;
  cloneObject.location.y += offsetPx;
  if (source.parent) source.parent.appendChild(cloneObject);
  cloneObject.update();

  if (cloneObject instanceof Terrain) {
    cloneObject.isLocked = false;
    SoundEffect.play(PresetSound.blockPut);
  } else if (cloneObject instanceof Card) {
    cloneObject.owner = '';
    cloneObject.toTopmost();
    cloneObject.isLock = false;
    SoundEffect.play(PresetSound.cardPut);
  } else if (cloneObject instanceof CardStack) {
    cloneObject.owner = '';
    cloneObject.toTopmost();
    cloneObject.isLock = false;
    SoundEffect.play(PresetSound.cardPut);
  } else if (cloneObject instanceof GameTableMask) {
    cloneObject.isLock = false;
    SoundEffect.play(PresetSound.cardPut);
  } else if (cloneObject instanceof TextNote) {
    cloneObject.toTopmost();
    SoundEffect.play(PresetSound.cardPut);
  } else if (cloneObject instanceof DiceSymbol) {
    SoundEffect.play(PresetSound.dicePut);
    SoundEffect.play(PresetSound.piecePut);
  } else {
    SoundEffect.play(PresetSound.piecePut);
  }
}
