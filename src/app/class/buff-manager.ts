import { DataElement } from './data-element';

export class BuffManager {
  constructor(private buffDataElement: DataElement) {}

  private get container(): DataElement | null {
    return this.buffDataElement.children[0] as DataElement | null;
  }

  delete(name: string): boolean {
    const container = this.container;
    if (!container) return false;
    const data = container.getFirstElementByName(name);
    if (!data) return false;
    data.destroy();
    return true;
  }

  decreaseRound(): void {
    const container = this.container;
    if (!container) return;
    for (const data of container.children) {
      const sum = parseInt(data.value as string) - 1;
      data.value = sum;
    }
  }

  increaseRound(): void {
    const container = this.container;
    if (!container) return;
    for (const data of container.children) {
      const sum = parseInt(data.value as string) + 1;
      data.value = sum;
    }
  }

  deleteZeroRound(): void {
    const container = this.container;
    if (!container) return;
    for (const data of container.children) {
      if (parseInt(data.value as string) <= 0) {
        data.destroy();
      }
    }
  }

  addRound(name: string, info: string = '', round: number = 3): void {
    const container = this.container;
    if (!container) return;
    const data = this.buffDataElement.getFirstElementByName(name);
    if (data) {
      data.value = round;
      data.currentValue = info;
    } else {
      container.appendChild(
        DataElement.create(name, round, {
          type: 'numberResource',
          currentValue: info,
        })
      );
    }
  }
}
