import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';

export interface TabletopLocation {
  name: string;
  x: number;
  y: number;
}

@SyncObject('TabletopObject')
export class TabletopObject extends ObjectNode {
  @SyncVar() location: TabletopLocation = {
    name: 'table',
    x: 0,
    y: 0,
  };

  @SyncVar() posZ: number = 0;

  get isVisibleOnTable(): boolean {
    return this.location.name === 'table';
  }

  private _imageFile: ImageFile = ImageFile.Empty;
  private _dataElements: { [name: string]: string | null } = {};

  // GameDataElement getter/setter
  get rootDataElement(): DataElement {
    for (const node of this.children) {
      if (node.getAttribute('name') === this.aliasName) return node as DataElement;
    }
    return null!;
  }

  get imageDataElement(): DataElement {
    return this.getElement('image');
  }
  get commonDataElement(): DataElement {
    return this.getElement('common');
  }
  get detailDataElement(): DataElement {
    return this.getElement('detail');
  }

  get buffDataElement(): DataElement {
    return this.getElement('buff');
  } //リリィにてバフ機能用の追加

  addBuffDataElement() {
    if (!this.buffDataElement) {
      this.rootDataElement.appendChild(DataElement.create('buff', '', {}, `buff_${this.identifier}`));
    }
  }

  get imageFile(): ImageFile {
    if (!this.imageDataElement) return this._imageFile;
    const imageIdElement = this.imageDataElement.getFirstElementByName('imageIdentifier');
    if (imageIdElement && this._imageFile.identifier !== imageIdElement.value) {
      const file = ImageStorage.instance.get(imageIdElement.value as string);
      this._imageFile = file ? file : ImageFile.Empty;
    }
    return this._imageFile;
  }

  @SyncVar() isAltitudeIndicate: boolean = false;
  get altitude(): number {
    const element = this.getElement('altitude', this.commonDataElement);
    if (!element && this.commonDataElement) {
      this.commonDataElement.appendChild(DataElement.create('altitude', 0, {}, `altitude_${this.identifier}`));
    }
    const num = element ? +element.value : 0;
    return Number.isNaN(num) ? 0 : num;
  }
  set altitude(altitude: number) {
    const element = this.getElement('altitude', this.commonDataElement);
    if (element) element.value = altitude;
  }

  createDataElements() {
    this.initialize();
    const aliasName: string = this.aliasName;
    if (!this.rootDataElement) {
      const rootElement = DataElement.create(aliasName, '', {}, `${aliasName}_${this.identifier}`);
      this.appendChild(rootElement);
    }

    if (!this.imageDataElement) {
      const imageEl = DataElement.create('image', '', {}, `image_${this.identifier}`);
      this.rootDataElement.appendChild(imageEl);
      imageEl.appendChild(
        DataElement.create('imageIdentifier', '', { type: 'image' }, `imageIdentifier_${this.identifier}`)
      );
    }
    if (!this.commonDataElement)
      this.rootDataElement.appendChild(DataElement.create('common', '', {}, `common_${this.identifier}`));
    if (!this.detailDataElement)
      this.rootDataElement.appendChild(DataElement.create('detail', '', {}, `detail_${this.identifier}`));
    if (!this.buffDataElement)
      this.rootDataElement.appendChild(DataElement.create('buff', '', {}, `buff_${this.identifier}`)); //entyu
  }

  protected getElement(name: string, from: DataElement = this.rootDataElement): DataElement {
    if (!from) return null!;
    let element: DataElement | null = this._dataElements[name]
      ? ObjectStore.instance.get(this._dataElements[name])
      : null;
    if (!element || !from.contains(element)) {
      element = from.getFirstElementByName(name);
      this._dataElements[name] = element ? element.identifier : null;
    }
    return element!;
  }

  protected getCommonValue<T extends string | number>(elementName: string, defaultValue: T): T {
    const element = this.getElement(elementName, this.commonDataElement);
    if (!element) return defaultValue;

    if (typeof defaultValue === 'number') {
      const number: number = +element.value;
      return (Number.isNaN(number) ? defaultValue : number) as T;
    } else {
      return `${element.value}` as T;
    }
  }

  protected setCommonValue(elementName: string, value: string | number) {
    const element = this.getElement(elementName, this.commonDataElement);
    if (!element) {
      return;
    }
    element.value = value;
  }

  protected getImageFile(elementName: string): ImageFile | null {
    if (!this.imageDataElement) return null;
    const image = this.getElement(elementName, this.imageDataElement);
    return image ? ImageStorage.instance.get(image.value as string) : null;
  }

  protected setImageFile(elementName: string, imageFile: ImageFile) {
    const image = imageFile ? this.getElement(elementName, this.imageDataElement) : null;
    if (!image) return;
    image.value = imageFile.identifier;
  }

  setLocation(location: string) {
    this.location.name = location;
    this.update();
  }
}
