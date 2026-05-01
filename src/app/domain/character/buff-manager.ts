import { DataElement, DataElementType } from '@axe/domain/data/data-element';

export class BuffManager {
  constructor(private readonly buffDataElement: DataElement | null) {}

  private get container(): DataElement | null {
    return this.buffDataElement?.children[0] ?? null;
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
      const sum = parseInt(String(data.value)) - 1;
      data.value = sum;
    }
  }

  increaseRound(): void {
    const container = this.container;
    if (!container) return;
    for (const data of container.children) {
      const sum = parseInt(String(data.value)) + 1;
      data.value = sum;
    }
  }

  deleteZeroRound(): void {
    const container = this.container;
    if (!container) return;
    for (const data of container.children) {
      if (parseInt(String(data.value)) <= 0) {
        data.destroy();
      }
    }
  }

  addRound(name: string, info: string = '', round: number = 3): void {
    if (!this.buffDataElement) return;
    const container =
      this.container ??
      (() => {
        const newContainer = DataElement.create('バフ/デバフ', '', {}, `${this.buffDataElement!.identifier}_container`);
        this.buffDataElement!.appendChild(newContainer);
        return newContainer;
      })();
    const data = this.buffDataElement?.getFirstElementByName(name);
    if (data) {
      data.value = round;
      data.currentValue = info;
    } else {
      container.appendChild(
        DataElement.create(name, round, {
          type: DataElementType.NUMBER_RESOURCE,
          currentValue: info,
        })
      );
    }
  }
}
