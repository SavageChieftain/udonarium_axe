import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DiceTablePalette } from '@axe/domain/chat/chat-palette';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { DiceTable } from '@axe/domain/dice/dice-table';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dice-table-setting',
  templateUrl: './dice-table-setting.component.html',
  host: { class: 'block h-full' },
  imports: [FormsModule, NgSelectComponent, NgOptionComponent],
})
export class DiceTableSettingComponent {
  private readonly modalService = inject(ModalService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);

  get gameType(): string {
    const table = this.selectedTable;
    return this.isEditable && table ? (table.diceTablePalette?.dicebot ?? '') : '';
  }
  set gameType(gameType: string) {
    const table = this.selectedTable;
    if (this.isEditable && table) {
      table.diceTablePalette!.dicebot = gameType;
    }
  }

  loadDiceBot(gameType: string) {
    DiceBot.getHelpMessage(gameType).then((_help) => {});
  }

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }

  get tableName(): string {
    const table = this.selectedTable;
    return this.isEditable && table ? table.name : '';
  }
  set tableName(tableName: string) {
    const table = this.selectedTable;
    if (this.isEditable && table) table.name = tableName;
  }

  get tableDice(): string {
    const table = this.selectedTable;
    return this.isEditable && table ? table.dice : '';
  }
  set tableDice(tableDice: string) {
    const table = this.selectedTable;
    if (this.isEditable && table) table.dice = tableDice;
  }

  get tableCommand(): string {
    const table = this.selectedTable;
    return this.isEditable && table ? table.command : '';
  }
  set tableCommand(tableCommand: string) {
    const table = this.selectedTable;
    if (this.isEditable && table) table.command = tableCommand;
  }

  get tableText(): string {
    const table = this.selectedTable;
    return this.isEditable && table ? table.text : '';
  }
  set tableText(tableText: string) {
    const table = this.selectedTable;
    if (this.isEditable && table) table.text = tableText + '';
  }

  get diceTablePalette(): DiceTablePalette {
    const table = this.selectedTable;
    if (!this.isEditable || !table) {
      return Object.create(DiceTablePalette.prototype) as DiceTablePalette;
    }

    for (const child of table.children) {
      if (child instanceof DiceTablePalette) return child;
    }
    return Object.create(DiceTablePalette.prototype) as DiceTablePalette;
  }

  isEdit = signal(false);
  private readonly _selectedTable = signal<DiceTable | null>(null);
  get selectedTable(): DiceTable | null {
    return this._selectedTable();
  }
  set selectedTable(value: DiceTable | null) {
    this._selectedTable.set(value);
  }
  readonly editPalette = signal('');

  get isEmpty(): boolean {
    return false;
  }

  get isSelected(): boolean {
    return this.selectedTable !== null;
  }

  get isDeleted(): boolean {
    if (!this.selectedTable) return true;
    return this.objectStore.get<DiceTable>(this.selectedTable.identifier) == null;
  }

  get isEditable(): boolean {
    return !this.isEmpty && this.isSelected && !this.isDeleted;
  }

  readonly isSaving = signal(false);
  readonly progressPercent = signal(0);

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'ダイス表設定'));
  }

  selectDiceTable(identifier: string) {
    this._selectedTable.set(this.objectStore.get<DiceTable>(identifier));
  }

  getDiceTables(): DiceTable[] {
    return this.objectStore.getObjects(DiceTable);
  }

  createDiceTable() {
    const diceTable = DiceTable.create();
    this.selectDiceTable(diceTable.identifier);
  }

  async save() {
    if (!this.selectedTable) return;
    this.isSaving.set(true);
    this.progressPercent.set(0);

    const fileName: string = 'dice_table_' + this.selectedTable.name;

    await this.saveDataService.saveGameObjectAsync(this.selectedTable, fileName, (percent) => {
      this.progressPercent.set(percent);
    });

    setTimeout(() => {
      this.isSaving.set(false);
      this.progressPercent.set(0);
    }, 500);
  }

  delete() {
    if (!this.isEmpty && this.selectedTable) {
      this.selectedTable.destroy();
    }
  }

  toggleEditMode() {
    this.isEdit.update((v) => !v);
    const table = this.selectedTable;
    if (!table) return;

    if (this.isEdit()) {
      this.editPalette.set(table.diceTablePalette!.value + '');
    } else {
      table.diceTablePalette!.setPalette(this.editPalette());
    }
  }

  onSelectDiceTable(event: Event): void {
    this.selectDiceTable((event.target as HTMLInputElement).value);
  }
}
