import { AfterViewInit, Component, OnDestroy, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';

import { ObjectStore } from '@axe/core/synchronize-object/object-store';

import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { SaveDataService } from 'service/save-data.service';

import { DiceBot } from '@axe/dice-bot';
import { DiceTable } from '@axe/dice-table';
import { DiceTablePalette } from '@axe/chat-palette';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent, NgOptionComponent } from '@ng-select/ng-select';

@Component({
  selector: 'dice-table-setting',
  templateUrl: './dice-table-setting.component.html',
  styleUrls: ['./dice-table-setting.component.css'],
  imports: [FormsModule, NgSelectComponent, NgOptionComponent],
})
export class DiceTableSettingComponent implements OnInit, OnDestroy, AfterViewInit {
  private modalService = inject(ModalService);
  private saveDataService = inject(SaveDataService);
  private panelService = inject(PanelService);

  @Input('gameType') _gameType: string = '';
  @Output() gameTypeChange = new EventEmitter<string>();
  get gameType(): string {
    return this.isEditable ? this.selectedTable.diceTablePalette.dicebot : '';
  }
  set gameType(gameType: string) {
    if (this.isEditable) {
      this.selectedTable.diceTablePalette.dicebot = gameType;
      this._gameType = gameType;
      this.gameTypeChange.emit(gameType);
    }
  }

  loadDiceBot(gameType: string) {
    console.log('onChangeGameType ready');
    DiceBot.getHelpMessage(gameType).then((help) => {
      console.log('onChangeGameType done\n' + help);
    });
  }

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }

  get tableName(): string {
    return this.isEditable ? this.selectedTable.name : '';
  }
  set tableName(tableName: string) {
    if (this.isEditable) this.selectedTable.name = tableName;
  }

  get tableDice(): string {
    return this.isEditable ? this.selectedTable.dice : '';
  }
  set tableDice(tableDice: string) {
    if (this.isEditable) this.selectedTable.dice = tableDice;
  }

  get tableCommand(): string {
    return this.isEditable ? this.selectedTable.command : '';
  }
  set tableCommand(tableCommand: string) {
    if (this.isEditable) this.selectedTable.command = tableCommand;
  }

  get tableText(): string {
    return this.isEditable ? this.selectedTable.text : '';
  }
  set tableText(tableText: string) {
    if (this.isEditable) console.log(tableText);
    if (this.isEditable) this.selectedTable.text = tableText + '';
  }

  get diceTablePalette(): DiceTablePalette {
    if (!this.isEditable) return null!;

    for (const child of this.selectedTable.children) {
      if (child instanceof DiceTablePalette) return child;
    }
    return null!;
  }

  isEdit: boolean = false;
  selectedTable: DiceTable = null!;
  editPalette: string = '';

  //  get isEmpty(): boolean { return this.tableSelecter ? (this.tableSelecter.viewTable ? false : true) : true; }
  get isEmpty(): boolean {
    return false;
  }

  get isSelected(): boolean {
    return this.selectedTable ? true : false;
  }

  get isDeleted(): boolean {
    if (!this.selectedTable) return true;
    return ObjectStore.instance.get<DiceTable>(this.selectedTable.identifier) == null;
  }

  get isEditable(): boolean {
    //    return !this.isEmpty && !this.isDeleted;
    return !this.isEmpty && this.isSelected && !this.isDeleted;
  }

  isSaveing: boolean = false;
  progresPercent: number = 0;

  ngOnInit() {
    Promise.resolve().then(() => (this.modalService.title = this.panelService.title = 'ダイス表設定'));
  }

  ngAfterViewInit() {}

  ngOnDestroy() {}

  selectDiceTable(identifier: string) {
    this.selectedTable = ObjectStore.instance.get<DiceTable>(identifier);
  }

  getDiceTables(): DiceTable[] {
    return ObjectStore.instance.getObjects(DiceTable);
  }

  createDiceTable() {
    const diceTable = DiceTable.create();
    this.selectDiceTable(diceTable.identifier);
  }

  async save() {
    if (!this.selectedTable) return;
    this.isSaveing = true;
    this.progresPercent = 0;

    const fileName: string = 'dice_table_' + this.selectedTable.name;

    await this.saveDataService.saveGameObjectAsync(this.selectedTable, fileName, (percent) => {
      this.progresPercent = percent;
    });

    setTimeout(() => {
      this.isSaveing = false;
      this.progresPercent = 0;
    }, 500);
  }

  delete() {
    if (!this.isEmpty && this.selectedTable) {
      this.selectedTable.destroy();
    }
  }

  toggleEditMode() {
    this.isEdit = this.isEdit ? false : true;
    if (this.isEdit) {
      this.editPalette = this.selectedTable.diceTablePalette.value + '';
    } else {
      this.selectedTable.diceTablePalette.setPalette(this.editPalette);
    }
  }
}
