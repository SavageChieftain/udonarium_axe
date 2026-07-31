import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { RolePermissionService } from '@axe/application/permission/role-permission.service';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { ViewportService } from '@axe/application/ui/viewport.service';
import { emitSelectGameTable, triggerUpdateGameObject } from '@axe/core/event/domain-events';
import { ImageFile } from '@axe/core/storage/image-file';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { Config } from '@axe/domain/peer/config';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { FilterType, GameTable, GridSnapStyle, GridType } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import {
  MapImageGridAdjusterComponent,
  MapImageGridAdjusterResult,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-grid-adjuster.component';
import { FileSelecterComponent } from '@axe/ui/components/file-selecter/file-selecter.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-table-setting',
  templateUrl: './game-table-setting.component.html',
  host: { class: 'block', '[attr.inert]': "isReadOnly() ? '' : null" },
  imports: [NgClass, FormsModule, NgSelectComponent, NgOptionComponent, SafePipe, TranslocoModule],
})
export class GameTableSettingComponent {
  protected readonly isCompact = inject(ViewportService).isCompact;
  private readonly rolePermission = inject(RolePermissionService);
  private readonly t = inject(TRANSLATE_FN);

  readonly isReadOnly = computed(() => {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return !this.rolePermission.canEditTabletop;
  });
  private readonly modalService = inject(ModalService);
  private readonly saveDataService = inject(SaveDataService);
  private readonly imageService = inject(ImageService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly objectSerializer = inject(ObjectSerializer);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly visionService = inject(VisionService);
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

  get tableImageBillboard(): boolean {
    return this.selectedTable?.imageBillboard ?? false;
  }
  set tableImageBillboard(value: boolean) {
    if (!this.selectedTable) return;
    this.selectedTable.imageBillboard = value;
    triggerUpdateGameObject(this.selectedTable.toContext());
  }

  get tableMode2d(): boolean {
    return this.selectedTable?.mode2d ?? false;
  }
  set tableMode2d(value: boolean) {
    if (!this.selectedTable) return;
    this.selectedTable.mode2d = value;
    triggerUpdateGameObject(this.selectedTable.toContext());
  }

  get tableDarknessEnabled(): boolean {
    return this.selectedTable?.darknessEnabled ?? false;
  }
  set tableDarknessEnabled(value: boolean) {
    if (this.isEditable && this.selectedTable) this.selectedTable.darknessEnabled = value;
  }

  get tableLightSnapToGrid(): boolean {
    return this.selectedTable?.lightSnapToGrid ?? false;
  }
  set tableLightSnapToGrid(value: boolean) {
    if (this.isEditable && this.selectedTable) this.selectedTable.lightSnapToGrid = value;
  }

  get tableDarknessLevelPercent(): number {
    return Math.round((this.selectedTable?.darknessLevel ?? 0) * 100);
  }
  set tableDarknessLevelPercent(value: number) {
    if (this.isEditable && this.selectedTable) this.selectedTable.darknessLevel = Number(value) / 100;
  }

  get tableGlobalIlluminationPercent(): number {
    return Math.round((this.selectedTable?.globalIllumination ?? 0) * 100);
  }
  set tableGlobalIlluminationPercent(value: number) {
    if (this.isEditable && this.selectedTable) this.selectedTable.globalIllumination = Number(value) / 100;
  }

  get tableAmbientColor(): string {
    return this.selectedTable?.ambientColor ?? '#05060a';
  }
  set tableAmbientColor(value: string) {
    if (this.isEditable && this.selectedTable) this.selectedTable.ambientColor = value;
  }

  get isGameMaster(): boolean {
    if (PeerCursor.myCursor) this.objectChange.versionOf(PeerCursor.myCursor.identifier)();
    return PeerCursor.isMyselfGameMaster;
  }

  get previewAsUserId(): string {
    return this.visionService.previewAsUserId() ?? '';
  }
  set previewAsUserId(value: string) {
    this.visionService.previewAsUserId.set(value ? value : null);
  }

  getNonGmCursors(): PeerCursor[] {
    this.objectChange.collectionOf('PeerCursor')();
    return this.objectStore.getObjects<PeerCursor>(PeerCursor).filter((cursor) => !cursor.isGameMaster);
  }

  minWallHeight: number = 1;
  maxWallHeight: number = 20;

  readonly wallFields = [
    {
      key: 'north',
      label: 'feature.tabletop.tableSetting.imageNorthWall',
      alt: 'feature.tabletop.tableSetting.imageNorthWallAlt',
      add: 'feature.tabletop.tableSetting.addImageNorthWall',
      image: () => this.tableNorthWallImage,
      show: () => this.tableShowNorthWall,
      setShow: (value: boolean) => (this.tableShowNorthWall = value),
      open: () => this.openNorthWallImageModal(),
    },
    {
      key: 'east',
      label: 'feature.tabletop.tableSetting.imageEastWall',
      alt: 'feature.tabletop.tableSetting.imageEastWallAlt',
      add: 'feature.tabletop.tableSetting.addImageEastWall',
      image: () => this.tableEastWallImage,
      show: () => this.tableShowEastWall,
      setShow: (value: boolean) => (this.tableShowEastWall = value),
      open: () => this.openEastWallImageModal(),
    },
    {
      key: 'south',
      label: 'feature.tabletop.tableSetting.imageSouthWall',
      alt: 'feature.tabletop.tableSetting.imageSouthWallAlt',
      add: 'feature.tabletop.tableSetting.addImageSouthWall',
      image: () => this.tableSouthWallImage,
      show: () => this.tableShowSouthWall,
      setShow: (value: boolean) => (this.tableShowSouthWall = value),
      open: () => this.openSouthWallImageModal(),
    },
    {
      key: 'west',
      label: 'feature.tabletop.tableSetting.imageWestWall',
      alt: 'feature.tabletop.tableSetting.imageWestWallAlt',
      add: 'feature.tabletop.tableSetting.addImageWestWall',
      image: () => this.tableWestWallImage,
      show: () => this.tableShowWestWall,
      setShow: (value: boolean) => (this.tableShowWestWall = value),
      open: () => this.openWestWallImageModal(),
    },
  ];

  get tableWallHeight(): number {
    return this.selectedTable?.wallHeight ?? 10;
  }
  set tableWallHeight(value: number) {
    if (this.isEditable && this.selectedTable) this.selectedTable.wallHeight = Number(value);
  }

  private wallImage(identifier: string | undefined): ImageFile {
    this.objectChange.fileVersion();
    if (this.selectedTable) this.objectChange.versionOf(this.selectedTable.identifier)();
    return this.imageService.getEmptyOr(identifier ?? '');
  }

  get tableNorthWallImage(): ImageFile {
    return this.wallImage(this.selectedTable?.northWallImageIdentifier);
  }
  get tableEastWallImage(): ImageFile {
    return this.wallImage(this.selectedTable?.eastWallImageIdentifier);
  }
  get tableSouthWallImage(): ImageFile {
    return this.wallImage(this.selectedTable?.southWallImageIdentifier);
  }
  get tableWestWallImage(): ImageFile {
    return this.wallImage(this.selectedTable?.westWallImageIdentifier);
  }

  get tableShowNorthWall(): boolean {
    return this.selectedTable?.showNorthWall ?? false;
  }
  set tableShowNorthWall(value: boolean) {
    if (this.isEditable && this.selectedTable) this.selectedTable.showNorthWall = value;
  }
  get tableShowEastWall(): boolean {
    return this.selectedTable?.showEastWall ?? false;
  }
  set tableShowEastWall(value: boolean) {
    if (this.isEditable && this.selectedTable) this.selectedTable.showEastWall = value;
  }
  get tableShowSouthWall(): boolean {
    return this.selectedTable?.showSouthWall ?? false;
  }
  set tableShowSouthWall(value: boolean) {
    if (this.isEditable && this.selectedTable) this.selectedTable.showSouthWall = value;
  }
  get tableShowWestWall(): boolean {
    return this.selectedTable?.showWestWall ?? false;
  }
  set tableShowWestWall(value: boolean) {
    if (this.isEditable && this.selectedTable) this.selectedTable.showWestWall = value;
  }

  get tableGridSnapStyle(): GridSnapStyle {
    return this.selectedTable?.gridSnapStyle ?? GridSnapStyle.CENTER;
  }
  set tableGridSnapStyle(snapStyle: GridSnapStyle) {
    if (this.isEditable && this.selectedTable) this.selectedTable.gridSnapStyle = Number(snapStyle);
  }

  get tableSnapMode(): string {
    if (!this.tableGridSnap) return 'off';
    switch (this.tableGridSnapStyle) {
      case GridSnapStyle.VERTEX:
        return 'vertex';
      case GridSnapStyle.BOTH:
        return 'both';
      case GridSnapStyle.ALL:
        return 'all';
      default:
        return 'center';
    }
  }
  set tableSnapMode(mode: string) {
    if (!this.selectedTable) return;
    if (mode === 'off') {
      this.selectedTable.gridSnap = false;
    } else {
      this.selectedTable.gridSnap = true;
      this.selectedTable.gridSnapStyle =
        mode === 'vertex'
          ? GridSnapStyle.VERTEX
          : mode === 'both'
            ? GridSnapStyle.BOTH
            : mode === 'all'
              ? GridSnapStyle.ALL
              : GridSnapStyle.CENTER;
    }
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
    queueMicrotask(
      () => (this.modalService.title = this.panelService.title = this.t('feature.tabletop.tableSetting.title'))
    );
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
    if (!this.rolePermission.canEditTabletop) return;
    const gameTable = new GameTable();
    gameTable.name = this.t('feature.tabletop.tableSetting.defaultName');
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
    if (!this.rolePermission.canEditTabletop) return;
    if (!this.isEmpty && this.selectedTable) {
      this.selectedTableXml = this.selectedTable.toXml();
      this.selectedTable.destroy();
    }
  }

  restore() {
    if (!this.rolePermission.canEditTabletop) return;
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

  openBgImageGridAdjust() {
    if (this.isDeleted) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: false }).then((imageIdentifier) => {
      if (!this.selectedTable || !imageIdentifier) return;
      const gridSize = this.selectedTable.gridSize;
      const gridColor = this.selectedTable.gridColor;
      this.modalService
        .open<MapImageGridAdjusterResult | null>(MapImageGridAdjusterComponent, {
          imageIdentifier,
          gridSize,
          gridColor,
          fitWidth: true,
          gridType: this.selectedTable.gridType,
        })
        .then((res) => {
          const table = this.selectedTable;
          if (!table || !res) return;
          table.imageIdentifier = res.imageIdentifier;
          table.width = res.width;
          table.height = res.height;
          table.gridType = res.gridType;
        });
    });
  }

  openDistanceViewImageModal() {
    if (this.isDeleted) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((value) => {
      if (!this.selectedTable || !value) return;
      this.selectedTable.backgroundImageIdentifier = value;
    });
  }

  private openWallImageModal(apply: (table: GameTable, value: string) => void) {
    if (this.isDeleted) return;
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: true }).then((value) => {
      if (!this.selectedTable || !value) return;
      apply(this.selectedTable, value);
    });
  }
  openNorthWallImageModal() {
    this.openWallImageModal((t, v) => (t.northWallImageIdentifier = v));
  }
  openEastWallImageModal() {
    this.openWallImageModal((t, v) => (t.eastWallImageIdentifier = v));
  }
  openSouthWallImageModal() {
    this.openWallImageModal((t, v) => (t.southWallImageIdentifier = v));
  }
  openWestWallImageModal() {
    this.openWallImageModal((t, v) => (t.westWallImageIdentifier = v));
  }

  onSelectGameTable(event: Event): void {
    this.selectGameTable((event.target as HTMLInputElement).value);
  }
}
