import { SyncObject } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { InnerXml, ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { Coin } from '@axe/domain/coin/coin';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { DiceTable } from '@axe/domain/dice/dice-table';
import { EffectField } from '@axe/domain/effect/effect-field';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { CutIn } from '@axe/domain/media/cut-in';
import { Party } from '@axe/domain/party/party';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { LightSource } from '@axe/domain/tabletop/light-source';
import { clearOwnership } from '@axe/domain/tabletop/ownership';
import { RangeArea } from '@axe/domain/tabletop/range';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { TextNote } from '@axe/domain/tabletop/text-note';

@SyncObject('room')
export class Room extends GameObject implements InnerXml {
  // GameObject Lifecycle
  override onStoreAdded() {
    super.onStoreAdded();
    ObjectStore.instance.remove(this); // ObjectStoreには登録しない
  }

  get reloadCheck(): ReloadCheck {
    return ObjectStore.instance.get<ReloadCheck>('ReloadCheck')!;
  }

  innerXml(): string {
    let xml = '';
    const objects: GameObject[] = [
      ...ObjectStore.instance.getObjects(GameTable),
      ...ObjectStore.instance.getObjects(Party),
      ...ObjectStore.instance.getObjects(GameCharacter),
      ...ObjectStore.instance.getObjects(RangeArea),
      ...ObjectStore.instance.getObjects(LightSource),
      ...ObjectStore.instance.getObjects(TextNote),
      ...ObjectStore.instance.getObjects(CardStack),
      ...ObjectStore.instance.getObjects(Card).filter((obj) => {
        return obj.parent === null;
      }),
      ...ObjectStore.instance.getObjects(DiceSymbol),
      ...ObjectStore.instance.getObjects(Coin),
      ...ObjectStore.instance.getObjects(CutIn),
      ...ObjectStore.instance.getObjects(DiceTable),
      ...ObjectStore.instance.getObjects(EffectPreset),
      ...ObjectStore.instance.getObjects(EffectField),
    ];

    for (const object of objects) {
      xml += object.toXml();
    }
    return xml;
  }

  parseInnerXml(element: Element) {
    const objects: GameObject[] = [
      ...ObjectStore.instance.getObjects(GameTable),
      ...ObjectStore.instance.getObjects(GameTableMask),
      ...ObjectStore.instance.getObjects(GameTableScratchMask),
      ...ObjectStore.instance.getObjects(Terrain),
      ...ObjectStore.instance.getObjects(Party),
      ...ObjectStore.instance.getObjects(GameCharacter),
      ...ObjectStore.instance.getObjects(RangeArea),
      ...ObjectStore.instance.getObjects(LightSource),
      ...ObjectStore.instance.getObjects(TextNote),
      ...ObjectStore.instance.getObjects(CardStack),
      ...ObjectStore.instance.getObjects(Card),
      ...ObjectStore.instance.getObjects(DiceSymbol),
      ...ObjectStore.instance.getObjects(Coin),
      ...ObjectStore.instance.getObjects(CutIn),
      ...ObjectStore.instance.getObjects(DiceTable),
      ...ObjectStore.instance.getObjects(EffectPreset),
      ...ObjectStore.instance.getObjects(EffectField),
    ];

    const reLoadOk = this.reloadCheck.answerCheck();
    if (reLoadOk) {
      for (const object of objects) {
        object.destroy();
      }
      for (let i = 0; i < element.children.length; i++) {
        ObjectSerializer.instance.parseXml(element.children[i]);
      }
      clearOwnership(ObjectStore.instance.getObjects());
    }
  }
}
