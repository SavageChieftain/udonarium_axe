import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageService } from '@axe/core/storage/image.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { emitSelectGameTable, triggerUpdateGameObject } from '@axe/domain/domain-events';
import { Config } from '@axe/domain/peer/config';
import { FilterType, GameTable, GridSnapStyle, GridType } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { FileSelecterComponent } from '@axe/shared/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-table-setting',
  templateUrl: './game-table-setting.component.html',
  styleUrls: ['./game-table-setting.component.css'],
  imports: [FormsModule, NgClass, NgSelectComponent, NgOptionComponent, SafePipe],
})
export class GameTableSettingComponent {
  private readonly modalService = inject(ModalService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly imageService = inject(ImageService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectSerializer = inject(ObjectSerializer);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  get gameType(): string {
    return this.config.defaultDiceBot;
  }
  set gameType(gameType: string) {
    this.config.defaultDiceBot = gameType;
  }
  loadDiceBot(gameType: string) {
    DiceBot.getHelpMessage(gameType).then(() => {});
  }

  get config(): Config {
    return this.objectStore.get<Config>('Config')!;
  }

  minSize: number = 1;
  maxSize: number = 100;

  get diceBotInfos() {
    return DiceBot.diceBotInfos;
  }

  get tableBackgroundImage(): ImageFile {
    this.objectChange.fileVersion();
    if (this.selectedTable) this.objectChange.versionOf(this.selectedTable.identifier)();
    return this.imageService.getEmptyOr(this.selectedTable ? this.selectedTable.imageIdentifier : '');
  }

  get tableDistanceviewImage(): ImageFile {
    this.objectChange.fileVersion();
    if (this.selectedTable) this.objectChange.versionOf(this.selectedTable.identifier)();
    return this.imageService.getEmptyOr(this.selectedTable ? this.selectedTable.backgroundImageIdentifier : '');
  }

  get tableName(): string {
    return this.selectedTable?.name ?? '';
  }
  set tableName(tableName: string) {
    if (this.isEditable && this.selectedTable) this.selectedTable.name = tableName;
  }

  get tableWidth(): number {
    return this.selectedTable?.width ?? 10;
  }
  set tableWidth(tableWidth: number) {
    if (this.isEditable && this.selectedTable) this.selectedTable.width = tableWidth;
  }

  get tableHeight(): number {
    return this.selectedTable?.height ?? 10;
  }
  set tableHeight(tableHeight: number) {
    if (this.isEditable && this.selectedTable) this.selectedTable.height = tableHeight;
  }

  get tableGridColor(): string {
    return this.selectedTable?.gridColor.substring(0, 7) ?? '#000000';
  }
  set tableGridColor(tableGridColor: string) {
    if (this.isEditable && this.selectedTable) this.selectedTable.gridColor = tableGridColor + 'e6';
  }

  get tableGridFontColor(): string {
    return this.selectedTable?.gridFontColor.substring(0, 7) ?? '#000000';
  }
  set tableGridFontColor(tableGridFontColor: string) {
    if (this.isEditable && this.selectedTable) this.selectedTable.gridFontColor = tableGridFontColor + 'e6';
  }

  get tableGridShow(): boolean {
    return this.selectedTable?.gridShow ?? false;
  }
  set tableGridShow(tableGridShow: boolean) {
    if (!this.selectedTable) return;
    this.selectedTable.gridShow = tableGridShow;
    if (tableGridShow) this.selectedTable.gridClipRect = null;
    triggerUpdateGameObject(this.selectedTable.toContext()); // 自分にだけイベントを発行してグリッド更新を誘発
  }

  get tableGridSnap(): boolean {
    return this.selectedTable?.gridSnap ?? true;
  }
  set tableGridSnap(tableGridSnap: boolean) {
    if (!this.selectedTable) return;
    this.selectedTable.gridSnap = tableGridSnap;
  }

  get tableGridSnapStyle(): GridSnapStyle {
    return this.selectedTable?.gridSnapStyle ?? GridSnapStyle.CENTER;
  }
  set tableGridSnapStyle(snapStyle: GridSnapStyle) {
    if (this.isEditable && this.selectedTable) this.selectedTable.gridSnapStyle = Number(snapStyle);
  }

  get tableGridType(): GridType {
    return this.selectedTable?.gridType ?? 0;
  }
  set tableGridType(gridType: GridType) {
    if (this.isEditable && this.selectedTable) this.selectedTable.gridType = Number(gridType);
  }

  get tableDistanceviewFilter(): FilterType {
    return this.selectedTable?.backgroundFilterType ?? FilterType.NONE;
  }
  set tableDistanceviewFilter(filterType: FilterType) {
    if (this.isEditable && this.selectedTable) this.selectedTable.backgroundFilterType = filterType;
  }

  selectedTable: GameTable | null = null;
  selectedTableXml: string = '';

  get isEmpty(): boolean {
    return this.tableSelecter ? (this.tableSelecter.viewTable ? false : true) : true;
  }
  get isDeleted(): boolean {
    this.objectChange.collectionOf('game-table')();
    if (!this.selectedTable) return true;
    return this.objectStore.get<GameTable>(this.selectedTable.identifier) == null;
  }
  get isEditable(): boolean {
    return !this.isEmpty && !this.isDeleted;
  }

  readonly isSaving = signal(false);
  readonly progressPercent = signal(0);

  constructor() {
    queueMicrotask(() => (this.modalService.title = this.panelService.title = 'テーブル設定'));
    this.selectedTable = this.tableSelecter.viewTable;
    this.objectChange.objectDeleted$.subscribe((e) => {
      if (!this.selectedTable || e.identifier !== this.selectedTable.identifier) return;
      const object = this.objectStore.get(e.identifier);
      if (object !== null) {
        this.selectedTableXml = object.toXml();
      }
    }, this.destroyRef);
  }

  selectGameTable(identifier: string) {
    emitSelectGameTable({ identifier });
    this.selectedTable = this.objectStore.get<GameTable>(identifier);
    this.selectedTableXml = '';
  }

  getGameTables(): GameTable[] {
    return this.objectStore.getObjects(GameTable);
  }

  createGameTable() {
    const gameTable = new GameTable();
    gameTable.name = '白紙のテーブル';
    gameTable.imageIdentifier = ImageFile.Empty.identifier;
    gameTable.gridShow = true;
    gameTable.initialize();
    this.selectGameTable(gameTable.identifier);
  }

  async save() {
    if (!this.selectedTable || this.isSaving()) return;
    this.isSaving.set(true);
    this.progressPercent.set(0);

    this.selectedTable.selected = true;
    await this.saveDataService.saveGameObjectAsync(this.selectedTable, 'map_' + this.selectedTable.name, (percent) => {
      this.progressPercent.set(percent);
    });

    setTimeout(() => {
      this.isSaving.set(false);
      this.progressPercent.set(0);
    }, 500);
  }

  delete() {
    if (!this.isEmpty && this.selectedTable) {
      this.selectedTableXml = this.selectedTable.toXml();
      this.selectedTable.destroy();
    }
  }

  restore() {
    if (this.selectedTable && this.selectedTableXml) {
      const restoreTable = this.objectSerializer.parseXml(this.selectedTableXml)!;
      this.selectGameTable(restoreTable.identifier);
      this.selectedTableXml = '';
    }
  }

  openBgImageModal() {
    if (this.isDeleted) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((value) => {
      if (!this.selectedTable || !value) return;
      this.selectedTable.imageIdentifier = value;
    });
  }

  openDistanceViewImageModal() {
    if (this.isDeleted) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((value) => {
      if (!this.selectedTable || !value) return;
      this.selectedTable.backgroundImageIdentifier = value;
    });
  }

  onSelectGameTable(event: Event): void {
    this.selectGameTable((event.target as HTMLInputElement).value);
  }
}
