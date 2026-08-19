import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TurnOrderService } from '@axe/application/turn/turn-order.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { describeBuffModifier, parseBuffModifierRequest } from '@axe/domain/character/buff-modifier';
import {
  BuffTimelineBar,
  BuffTimelineRow,
  timelineColumns,
  timelineSpan,
  toTimelineBars,
} from '@axe/domain/character/buff-timeline';
import { BUFF_TIMINGS, BuffTiming } from '@axe/domain/character/buff-timing';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

const BUILDER_OPERATORS = ['+', '-', '='] as const;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-buff-manager-panel',
  templateUrl: './buff-manager-panel.component.html',
  imports: [FormsModule, SafePipe, TranslocoModule],
})
export class BuffManagerPanelComponent {
  private readonly objectStore = inject(ObjectStore);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly inventory = inject(GameObjectInventoryService);
  private readonly turnOrder = inject(TurnOrderService);

  readonly timingChoices = BUFF_TIMINGS;
  readonly operatorChoices = BUILDER_OPERATORS;

  readonly round = computed(() => {
    this.objectChange.versionOf('TurnState')();
    return Math.max(1, this.turnOrder.round);
  });

  readonly rows = computed<BuffTimelineRow[]>(() => {
    this.objectChange.collectionOf('character')();
    this.objectChange.collectionOf('data')();
    this.bumped();

    const rows: BuffTimelineRow[] = [];
    for (const character of this.inventory.tableInventory.tabletopObjects as GameCharacter[]) {
      this.objectChange.versionOf(character.identifier)();
      const bars = toTimelineBars(character.buffDataElement ?? null);
      if (bars.length < 1) continue;
      rows.push({
        characterIdentifier: character.identifier,
        characterName: character.name,
        imageUrl: character.imageFile?.url ?? '',
        bars,
      });
    }
    return rows;
  });

  readonly span = computed(() => timelineSpan(this.rows()));
  readonly columns = computed(() => timelineColumns(this.round(), this.span()));

  /** Rounds that fall inside the chart, so a longer buff runs to the edge rather than off it. */
  barWidth(bar: BuffTimelineBar): number {
    return Math.min(this.span(), Math.max(1, bar.rounds));
  }

  isRunningOff(bar: BuffTimelineBar): boolean {
    return bar.rounds > this.span();
  }

  private readonly _bumped = signal(0);
  private readonly bumped = this._bumped.asReadonly();

  private refresh(): void {
    this._bumped.update((v) => v + 1);
  }

  readonly selected = signal<string>('');

  select(bar: BuffTimelineBar): void {
    this.selected.update((current) => (current === bar.identifier ? '' : bar.identifier));
  }

  readonly selectedElement = computed<DataElement | null>(() => {
    const identifier = this.selected();
    this.bumped();
    if (identifier.length < 1) return null;
    return this.objectStore.get<DataElement>(identifier) ?? null;
  });

  readonly selectedBar = computed<BuffTimelineBar | null>(() => {
    const identifier = this.selected();
    for (const row of this.rows()) {
      const found = row.bars.find((bar) => bar.identifier === identifier);
      if (found) return found;
    }
    return null;
  });

  private ownerOf(element: DataElement): GameCharacter | null {
    let node = element.parent;
    while (node) {
      if (node instanceof GameCharacter) return node;
      node = node.parent;
    }
    return null;
  }

  setName(value: string): void {
    const element = this.selectedElement();
    if (!element) return;
    element.name = value.trim();
    this.touch(element);
  }

  setEffect(value: string): void {
    const element = this.selectedElement();
    if (!element) return;
    element.currentValue = value;
    this.touch(element);
  }

  setRounds(value: number): void {
    const element = this.selectedElement();
    if (!element || !Number.isFinite(value)) return;
    element.value = Math.max(0, Math.round(value));
    this.touch(element);
  }

  setTiming(value: BuffTiming): void {
    const element = this.selectedElement();
    if (!element) return;
    element.setAttribute(DataElementAttribute.BUFF_TIMING, value);
    if (value === 'roundEnd') element.removeAttribute(DataElementAttribute.BUFF_TRIGGER);
    this.touch(element);
  }

  setTrigger(value: string): void {
    const element = this.selectedElement();
    if (!element) return;
    const trimmed = value.trim();
    if (trimmed.length > 0) element.setAttribute(DataElementAttribute.BUFF_TRIGGER, trimmed);
    else element.removeAttribute(DataElementAttribute.BUFF_TRIGGER);
    this.touch(element);
  }

  removeSelected(): void {
    const element = this.selectedElement();
    if (!element) return;
    const owner = this.ownerOf(element);
    if (owner) owner.buffs.remove(element);
    else element.destroy();
    this.selected.set('');
    this.refresh();
  }

  onSetName(event: Event): void {
    this.setName((event.target as HTMLInputElement).value);
  }

  onSetEffect(event: Event): void {
    this.setEffect((event.target as HTMLInputElement).value);
  }

  onSetRounds(event: Event): void {
    this.setRounds((event.target as HTMLInputElement).valueAsNumber);
  }

  onSetTiming(event: Event): void {
    this.setTiming((event.target as HTMLSelectElement).value as BuffTiming);
  }

  onSetTrigger(event: Event): void {
    this.setTrigger((event.target as HTMLInputElement).value);
  }

  private touch(element: DataElement): void {
    this.objectChange.notifyChanged(element.identifier);
    const owner = this.ownerOf(element);
    if (owner) this.objectChange.notifyChanged(owner.identifier);
    this.refresh();
  }

  // The builder for the &! command, so the syntax can be read off rather than remembered.
  readonly builderName = signal('猛攻撃');
  readonly builderStatus = signal('命中');
  readonly builderOperator = signal<string>('+');
  readonly builderAmount = signal('2');
  readonly builderRounds = signal('3');
  readonly builderTiming = signal<BuffTiming>('roundEnd');
  readonly builderTrigger = signal('');

  readonly builderCommand = computed(() => {
    const parts = [
      this.builderName().trim() || 'バフ',
      this.builderStatus().trim(),
      this.builderOperator(),
      this.builderAmount().trim(),
      this.builderRounds().trim(),
    ];
    const timing = this.builderTiming();
    const trigger = this.builderTrigger().trim();
    if (timing !== 'roundEnd' || trigger.length > 0) parts.push(timing);
    if (trigger.length > 0) parts.push(trigger);
    return `&!${parts.join('/')}`;
  });

  readonly builderPreview = computed(() => {
    const request = parseBuffModifierRequest(this.builderStatus(), this.builderOperator(), this.builderAmount());
    return request ? describeBuffModifier(request) : '';
  });

  readonly copied = signal(false);

  async copyCommand(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.builderCommand());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1200);
    } catch {
      /* clipboard unavailable (permission, insecure context) — the text is on screen to copy by hand */
    }
  }
}
