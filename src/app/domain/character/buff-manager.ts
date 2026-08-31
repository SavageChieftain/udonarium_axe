import { BuffAppearance } from '@axe/domain/character/buff-appearance';
import {
  BuffModifier,
  clearBuffModifier,
  ParsedBuffModifierRequest,
  readBuffModifier,
  writeBuffModifier,
} from '@axe/domain/character/buff-modifier';
import { buffExpires, BuffTiming, BuffTurnActor, isBuffDueAt } from '@axe/domain/character/buff-timing';
import { StatusAccessor } from '@axe/domain/character/status-accessor';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';

export class BuffManager {
  constructor(
    private readonly buffDataElement: DataElement | null,
    private readonly owner: () => BuffTurnActor = () => ({ identifier: '', name: '' }),
    private readonly status: () => StatusAccessor | null = () => null
  ) {}

  private get container(): DataElement | null {
    return this.buffDataElement?.children[0] ?? null;
  }

  delete(name: string): boolean {
    const container = this.container;
    if (!container) return false;
    const data = container.getFirstElementByName(name);
    if (!data) return false;
    this.remove(data);
    return true;
  }

  /** Takes the buff away, putting back whatever it moved on the sheet. */
  remove(data: DataElement): void {
    this.revertModifier(data);
    data.destroy();
  }

  /**
   * Moves a status by what the buff asks for and writes down how far it moved, so the
   * same distance goes back when the buff runs out. Null where the sheet has no such
   * status, which leaves the buff a plain note.
   */
  applyModifier(data: DataElement, request: ParsedBuffModifierRequest): BuffModifier | null {
    const status = this.status();
    if (!status) return null;
    const before = status.getValue(request.target, request.slot);
    if (before == null) return null;

    const wanted = request.operator === 'set' ? request.amount - before : request.amount;
    status.changeValue(request.target, request.slot, wanted);
    const after = status.getValue(request.target, request.slot);
    const modifier: BuffModifier = {
      target: request.target,
      slot: request.slot,
      operator: request.operator,
      applied: (after ?? before) - before,
    };
    writeBuffModifier(data, modifier);
    return modifier;
  }

  private revertModifier(data: DataElement): void {
    const modifier = readBuffModifier(data);
    if (!modifier) return;
    this.status()?.changeValue(modifier.target, modifier.slot, -modifier.applied);
    clearBuffModifier(data);
  }

  decreaseRound(): void {
    const container = this.container;
    if (!container) return;
    for (const data of container.children) {
      if (!buffExpires(data)) continue;
      const sum = parseInt(String(data.value)) - 1;
      data.value = sum;
    }
  }

  increaseRound(): void {
    const container = this.container;
    if (!container) return;
    for (const data of container.children) {
      if (!buffExpires(data)) continue;
      const sum = parseInt(String(data.value)) + 1;
      data.value = sum;
    }
  }

  deleteZeroRound(): void {
    const container = this.container;
    if (!container) return;
    for (const data of [...container.children]) {
      if (!buffExpires(data)) continue;
      if (parseInt(String(data.value)) <= 0) {
        this.remove(data);
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
        this.remove(data);
      }
    }
    return expired;
  }

  /** The buff that goes by this name, once it is there to be found. */
  find(name: string): DataElement | null {
    return this.container?.getFirstElementByName(name) ?? null;
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
      // Putting the same buff on again starts it over, so whatever it moved goes back first.
      this.revertModifier(data);
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
