import { DataElement } from './data-element';

export class StatusAccessor {
  constructor(
    private detailDataElement: DataElement,
    private characterName: () => string
  ) {}

  canChangeName(name: string): boolean {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return false;
    return data.type === 'numberResource' || data.type === '' || data.type === 'note';
  }

  canChange(name: string, nowOrMax: string): boolean {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return false;
    if (data.type === 'numberResource') {
      return nowOrMax === 'now' || nowOrMax === 'max';
    }
    if (data.type === '' || data.type === 'note') {
      return nowOrMax === 'now';
    }
    return false;
  }

  getType(name: string, nowOrMax: string): string {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return null!;
    if (data.type === 'numberResource') {
      if (nowOrMax === 'now') return 'currentValue';
      if (nowOrMax === 'max') return 'value';
    } else if (data.type === '') {
      if (nowOrMax === 'now') return 'value';
    }
    return null!;
  }

  getTextType(name: string): string {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return null!;
    return data.type === 'numberResource' ? 'currentValue' : 'value';
  }

  getValue(name: string, nowOrMax: string): number {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return null!;
    const type = this.getType(name, nowOrMax);
    if (type == null) return null!;
    const raw = type === 'value' ? (data.value as string) : (data.currentValue as string);
    return parseInt(raw);
  }

  setValue(name: string, nowOrMax: string, setValue: number): boolean {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return false;
    const type = this.getType(name, nowOrMax);
    if (type == null) return false;
    if (type === 'value') {
      data.value = setValue;
    } else {
      data.currentValue = setValue;
    }
    return true;
  }

  setText(name: string, text: string): boolean {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return false;
    const type = this.getTextType(name);
    if (type == null) return false;
    if (type === 'value') {
      data.value = text;
    } else {
      data.currentValue = text;
    }
    return true;
  }

  changeValue(name: string, nowOrMax: string, addValue: number, limitMin?: boolean, limitMax?: boolean): string {
    const data = this.detailDataElement.getFirstElementByName(name);
    if (!data) return '';
    const type = this.getType(name, nowOrMax);
    if (!type) return '';

    const oldNum = this.getValue(name, nowOrMax);
    if (oldNum == null) return '';
    let sum = oldNum + addValue;

    let maxRecoveryMess = '';
    if (type === 'value') {
      if (limitMin && sum <= 0) {
        maxRecoveryMess = '(最小)';
        sum = 0;
      }
      this.setValue(name, nowOrMax, sum);
    }
    if (type === 'currentValue') {
      if (sum >= +data.value && limitMax) {
        maxRecoveryMess = '(最大)';
        sum = this.getValue(name, 'max');
      }
      if (limitMin && sum <= 0) {
        maxRecoveryMess = '(最小)';
        sum = 0;
      }
      this.setValue(name, nowOrMax, sum);
    }
    return `[${this.characterName()} ${oldNum}>${sum}${maxRecoveryMess}] `;
  }
}
