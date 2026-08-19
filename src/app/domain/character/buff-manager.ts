import { BuffAppearance } from '@axe/domain/character/buff-appearance';
import { BuffTiming, BuffTurnActor, isBuffDueAt } from '@axe/domain/character/buff-timing';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';

export class BuffManager {
  constructor(
    private readonly buffDataElement: DataElement | null,
    private readonly owner: () => BuffTurnActor = () => ({ identifier: '', name: '' })
  ) {}

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
    for (const data of [...container.children]) {
      if (parseInt(String(data.value)) <= 0) {
        data.destroy();
      }
    }
  }

  /** Counts the rounds down, removes the buffs that ran out and returns their names. */
  expireOneRound(): string[] {
    return this.expireAt('roundEnd', { identifier: '', name: '' });
  }

  /**
   * Counts down the buffs whose moment this is, removes the ones that ran out and returns
   * their names. `acting` is whose turn it is, which a buff pinned to a trigger character
   * waits for; it is unused at the end of a round, where everything counts down.
   */
  expireAt(timing: BuffTiming, acting: BuffTurnActor): string[] {
    const container = this.container;
    if (!container) return [];

    const owner = this.owner();
    const expired: string[] = [];
    for (const data of [...container.children]) {
      if (!isBuffDueAt(data, timing, owner, acting)) continue;
      const round = parseInt(String(data.value)) - 1;
      data.value = round;
      if (round <= 0) {
        expired.push(data.name);
        data.destroy();
      }
    }
    return expired;
  }

  addRound(name: string, info: string = '', round: number = 3, appearance: BuffAppearance = {}): void {
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
      applyAppearance(data, appearance);
    } else {
      const created = DataElement.create(name, round, {
        type: DataElementType.NUMBER_RESOURCE,
        currentValue: info,
      });
      applyAppearance(created, appearance);
      container.appendChild(created);
    }
  }
}

function applyAppearance(data: DataElement, appearance: BuffAppearance): void {
  if (appearance.timing !== undefined) {
    data.setAttribute(DataElementAttribute.BUFF_TIMING, appearance.timing);
  }
  if (appearance.trigger !== undefined) {
    if (appearance.trigger.length > 0) data.setAttribute(DataElementAttribute.BUFF_TRIGGER, appearance.trigger);
    else data.removeAttribute(DataElementAttribute.BUFF_TRIGGER);
  }
  if (appearance.color !== undefined) {
    if (appearance.color.length > 0) data.setAttribute(DataElementAttribute.BUFF_COLOR, appearance.color);
    else data.removeAttribute(DataElementAttribute.BUFF_COLOR);
  }
  if (appearance.icon !== undefined) {
    if (appearance.icon.length > 0) data.setAttribute(DataElementAttribute.BUFF_ICON, appearance.icon);
    else data.removeAttribute(DataElementAttribute.BUFF_ICON);
  }
}
