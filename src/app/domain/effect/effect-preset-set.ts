import { SyncObject } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { InnerXml, ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { EffectPreset } from '@axe/domain/effect/effect-preset';

/**
 * Carrying the effect library itself out and in.
 *
 * It is the holder for handing on the effects rather than the whole room, and it is not
 * kept in the store; it exists across the export and the import alone.
 */
@SyncObject('effect-preset-set')
export class EffectPresetSet extends ObjectNode implements InnerXml {
  // GameObject Lifecycle
  override onStoreAdded() {
    super.onStoreAdded();
    ObjectStore.instance.remove(this);
  }

  override innerXml(): string {
    return EffectPreset.list()
      .map((preset) => preset.toXml())
      .join('');
  }

  /** Importing only adds: nothing already there is removed, and only what shares an identifier is replaced. */
  override parseInnerXml(element: Element) {
    for (const child of Array.from(element.children)) {
      ObjectSerializer.instance.parseXml(child);
    }
  }
}
