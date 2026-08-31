import { SyncObject } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';
import { formatStatusAilments, parseStatusAilments, StatusAilment } from '@axe/domain/character/status-ailment';

const CATALOG_IDENTIFIER = 'StatusAilmentCatalog';

/**
 * The states a room keeps on hand, written one to a line.
 *
 * A node rather than a plain object because the list lives in the body of the element rather
 * than in an attribute: an attribute's newlines are folded into spaces when the xml is read
 * back, which would run every state onto one line.
 */
@SyncObject('status-ailment-catalog')
export class StatusAilmentCatalog extends ObjectNode {
  private static _instance: StatusAilmentCatalog;
  static get instance(): StatusAilmentCatalog {
    const stored = ObjectStore.instance.get<StatusAilmentCatalog>(CATALOG_IDENTIFIER);
    if (stored) return (StatusAilmentCatalog._instance = stored);
    if (!StatusAilmentCatalog._instance) StatusAilmentCatalog._instance = new StatusAilmentCatalog(CATALOG_IDENTIFIER);
    StatusAilmentCatalog._instance.initialize();
    return StatusAilmentCatalog._instance;
  }

  get ailments(): StatusAilment[] {
    return parseStatusAilments(`${this.value}`);
  }

  set ailments(list: readonly StatusAilment[]) {
    this.value = formatStatusAilments(list);
  }

  override parseInnerXml(element: Element) {
    super.parseInnerXml(element);
    // Updates the one the room already has rather than standing beside it, as the summary
    // setting does: both are made under a fixed identifier before any room is loaded.
    const catalog = StatusAilmentCatalog.instance;
    if (catalog === this) return;
    catalog.value = this.value;
    catalog.update();
    this.destroy();
  }
}
