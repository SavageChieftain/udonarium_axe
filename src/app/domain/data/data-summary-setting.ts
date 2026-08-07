import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { InnerXml } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';

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

  @SyncVar() sortTag: string = 'HP';
  @SyncVar() sortOrder: SortOrder = SortOrder.ASC;

  @SyncVar() sortTag2nd: string = 'name';
  @SyncVar() sortOrder2nd: SortOrder = SortOrder.ASC;

  @SyncVar() dataTag: string = 'HP MP 敏捷度 精神力';

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
    // XMLからの新規作成を許可せず、既存のオブジェクトを更新する
    const context = DataSummarySetting.instance.toContext();
    context.syncData = this.toContext().syncData;
    DataSummarySetting.instance.apply(context);
    DataSummarySetting.instance.update();

    this.destroy();
  }
}
