import { Attributes } from './core/synchronize-object/attributes';
import { SyncObject, SyncVar } from './core/synchronize-object/decorator';
import { GameObject } from './core/synchronize-object/game-object';
import { ObjectNode } from './core/synchronize-object/object-node';

const SAN_PATTERN = /^[SsＳｓ][AaＡａ][NnＮn]$/i;
const SANITY_PATTERN = /^正気度$/i;
const SAN_WARNING_THRESHOLD = 0.8;
const SAN_WARNING_COLOR = '#D22';
const DEFAULT_VALUE_COLOR = '#444';

/** DataElement.type に設定される型識別子 */
export const DataElementType = {
  /** 数値リソース (現在値/最大値を持つ) */
  NUMBER_RESOURCE: 'numberResource',
  /** 通常テキスト (デフォルト) */
  TEXT: '',
  /** ノート (長文テキスト) */
  NOTE: 'note',
  /** マークダウン */
  MARKDOWN: 'markdown',
} as const;

export type DataElementTypeValue = (typeof DataElementType)[keyof typeof DataElementType];

@SyncObject('data')
export class DataElement extends ObjectNode {
  @SyncVar() name: string;
  @SyncVar() type: string;
  @SyncVar() currentValue: number | string;

  get isNumberResource(): boolean {
    return this.type != null && this.type === DataElementType.NUMBER_RESOURCE;
  }
  get isNote(): boolean {
    return this.type != null && this.type === DataElementType.NOTE;
  }

  public static create(
    name: string,
    value: number | string = '',
    attributes: Attributes = {},
    identifier: string = ''
  ): DataElement {
    let dataElement: DataElement;
    if (identifier && 0 < identifier.length) {
      dataElement = new DataElement(identifier);
    } else {
      dataElement = new DataElement();
    }
    dataElement.attributes = attributes;
    dataElement.name = name;
    dataElement.value = value;
    dataElement.initialize();

    return dataElement;
  }

  getElementsByName(name: string): DataElement[] {
    const children: DataElement[] = [];
    for (const child of this.children) {
      if (child instanceof DataElement) {
        if (child.getAttribute('name') === name) children.push(child);
        Array.prototype.push.apply(children, child.getElementsByName(name));
      }
    }
    return children;
  }

  getElementsByType(type: string): DataElement[] {
    const children: DataElement[] = [];
    for (const child of this.children) {
      if (child instanceof DataElement) {
        if (child.getAttribute('type') === type) children.push(child);
        Array.prototype.push.apply(children, child.getElementsByType(type));
      }
    }
    return children;
  }

  getFirstElementByName(name: string): DataElement {
    for (const child of this.children) {
      if (child instanceof DataElement) {
        if (child.getAttribute('name') === name) return child;
        const match = child.getFirstElementByName(name);
        if (match) return match;
      }
    }
    return null!;
  }

  get myIdentifer() {
    return (this as unknown as GameObject).identifier;
  }

  get nowValueColor(): string {
    if (SAN_PATTERN.test(this.name) || SANITY_PATTERN.test(this.name)) {
      if (this.isNumberResource) {
        const current: number = this.currentValue as number;
        const value: number = this.value as number;
        if (current <= value * SAN_WARNING_THRESHOLD && current == this.currentValue && value == this.value) {
          return SAN_WARNING_COLOR;
        }
      }
    }
    return DEFAULT_VALUE_COLOR;
  }
}
