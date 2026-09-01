import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { InnerXml } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DEFAULT_STATUS_AILMENT_NAMES } from '@axe/domain/character/builtin-status-ailments';

/**
 * What a table wants to see of everybody at once: how they are holding up, what they roll on,
 * then what is wrong with them. The states come from the catalogue a room starts with, so the columns and the boxes
 * to tick them are named the same thing without either being written down twice.
 */
const DEFAULT_RESOURCE_TAGS = ['HP', 'MP'];

const DEFAULT_ABILITY_TAGS = ['敏捷度', '器用度', '筋力', '生命力', '知力', '精神力'];

const DEFAULT_DATA_TAG = [...DEFAULT_RESOURCE_TAGS, ...DEFAULT_ABILITY_TAGS, ...DEFAULT_STATUS_AILMENT_NAMES].join(' ');

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

@SyncObject('summary-setting')
export class DataSummarySetting extends GameObject implements InnerXml {
  private static _instance: DataSummarySetting;
  static get instance(): DataSummarySetting {
    const stored = ObjectStore.instance.get<DataSummarySetting>('DataSummarySetting');
    if (stored) return (DataSummarySetting._instance = stored);
    if (!DataSummarySetting._instance) DataSummarySetting._instance = new DataSummarySetting('DataSummarySetting');
    DataSummarySetting._instance.initialize();
    return DataSummarySetting._instance;
  }

  /** The quickest acts first, which is the order a fight is read in. */
  @SyncVar() sortTag: string = '敏捷度';
  @SyncVar() sortOrder: SortOrder = SortOrder.DESC;

  @SyncVar() sortTag2nd: string = 'name';
  @SyncVar() sortOrder2nd: SortOrder = SortOrder.ASC;

  @SyncVar() dataTag: string = DEFAULT_DATA_TAG;

  @SyncVar() folderPaths: string[] = [];

  private _dataTag!: string;
  private _dataTags!: string[];
  get dataTags(): string[] {
    if (this._dataTag !== this.dataTag) {
      this._dataTag = this.dataTag;
      this._dataTags = this.dataTag != null && this.dataTag.trim().length > 0 ? this.dataTag.trim().split(/\s+/) : [];
    }
    return this._dataTags;
  }

  innerXml(): string {
    return '';
  }
  parseInnerXml(_element: Element) {
    // updates the existing object rather than making one from the saved data
    const context = DataSummarySetting.instance.toContext();
    context.syncData = this.toContext().syncData;
    DataSummarySetting.instance.apply(context);
    DataSummarySetting.instance.update();

    this.destroy();
  }
}
