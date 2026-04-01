import { SyncObject } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { InnerXml, ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { DiceTable } from '@axe/domain/dice/dice-table';
import { CutIn } from '@axe/domain/media/cut-in';
import { ReloadCheck } from '@axe/domain/shared/reload-check';
import { TextNote } from '@axe/domain/shared/text-note';
import { GameTable } from '@axe/domain/tabletop/game-table';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { Terrain } from '@axe/domain/tabletop/terrain';

@SyncObject('room')
export class Room extends GameObject implements InnerXml {
  // GameObject Lifecycle
  onStoreAdded() {
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
      ...ObjectStore.instance.getObjects(GameCharacter),
      ...ObjectStore.instance.getObjects(RangeArea),
      ...ObjectStore.instance.getObjects(TextNote),
      ...ObjectStore.instance.getObjects(CardStack),
      ...ObjectStore.instance.getObjects(Card).filter((obj) => {
        return obj.parent === null;
      }),
      ...ObjectStore.instance.getObjects(DiceSymbol),
      ...ObjectStore.instance.getObjects(CutIn),
      ...ObjectStore.instance.getObjects(DiceTable),
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
      ...ObjectStore.instance.getObjects(GameCharacter),
      ...ObjectStore.instance.getObjects(RangeArea),
      ...ObjectStore.instance.getObjects(TextNote),
      ...ObjectStore.instance.getObjects(CardStack),
      ...ObjectStore.instance.getObjects(Card),
      ...ObjectStore.instance.getObjects(DiceSymbol),
      ...ObjectStore.instance.getObjects(CutIn),
      ...ObjectStore.instance.getObjects(DiceTable),
    ];

    const reLoadOk = this.reloadCheck.answerCheck();
    if (reLoadOk) {
      for (const object of objects) {
        object.destroy();
      }
      for (let i = 0; i < element.children.length; i++) {
        ObjectSerializer.instance.parseXml(element.children[i]);
      }
    }
  }
}
