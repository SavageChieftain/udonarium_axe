import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { DataElement, DataElementAttribute, DataElementFieldType } from '@axe/domain/data/data-element';
import { findJudgementCandidates, type SkillJudgementCandidate } from '@axe/domain/data/skill-table-judgement';
import {
  buildTableColumnHeaderGroups,
  findGapCellInColumn,
  getCellLabel,
  getCellUnit,
  getRawTableRows,
  getSelectOptions,
  getTableCell as getTableCellShared,
  getTableColumns as getTableColumnsShared,
  isCheckCellChecked,
  isGapColumn,
  isSelectValueListed,
  isTableControlRow as isTableControlRowShared,
  nextCheckCellValue,
  type TableColumn as DataElementTableColumn,
  type TableColumnHeaderGroup as DataElementTableColumnHeaderGroup,
} from '@axe/domain/data/table-layout';
import { evaluateCalcElement } from '@axe/features/data-element/game-data-element/game-data-element-calc-env';
import {
  type JudgeCandidatesState,
  JudgementCandidatesModalComponent,
} from '@axe/features/data-element/game-data-element/judgement-candidates-modal.component';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  selector: 'game-data-element-table-view',
  templateUrl: './game-data-element-table-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JudgementCandidatesModalComponent, SafePipe],
})
export class GameDataElementTableViewComponent {
  private readonly objectChange = inject(ObjectChangeService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly imageStorage = inject(ImageStorage);

  readonly element = input.required<DataElement>();
  readonly isValueLocked = input(false);
  readonly isJudgeModeEnabled = input(false);
  readonly loopHorizontal = input(false);
  readonly loopVertical = input(false);

  readonly judgeCandidatesState = signal<JudgeCandidatesState | null>(null);
  private readonly _judgeActive = signal<boolean>(false);

  private trackTableDependencies(): void {
    const element = this.element();
    this.objectChange.versionOf(element.identifier)();
    for (const row of element.children) {
      this.objectChange.versionOf(row.identifier)();
      for (const child of row.children) {
        this.objectChange.versionOf(child.identifier)();
      }
    }
  }

  readonly tableRows = computed(() => {
    this.trackTableDependencies();
    return getRawTableRows(this.element());
  });

  readonly tableBodyRows = computed(() => this.tableRows().filter((row) => !isTableControlRowShared(row)));

  readonly tableColumns = computed<DataElementTableColumn[]>(() => {
    this.trackTableDependencies();
    return getTableColumnsShared(this.element());
  });

  readonly hasTableColumnGroups = computed(() => this.tableColumns().some((column) => column.group.length > 0));

  readonly tableColumnHeaderGroups = computed<DataElementTableColumnHeaderGroup[]>(() =>
    buildTableColumnHeaderGroups(this.tableColumns())
  );

  readonly tableRowHeaderLabel = computed(() => {
    const element = this.element();
    this.objectChange.versionOf(element.identifier)();
    return element.getAttribute(DataElementAttribute.ROW_HEADER_LABEL).trim();
  });

  isJudgeMode(): boolean {
    return this.isJudgeModeEnabled() && this._judgeActive();
  }

  toggleJudgeActive(): void {
    this._judgeActive.update((v) => !v);
    this.judgeCandidatesState.set(null);
  }

  getTableCell(row: DataElement, columnName: string): DataElement | null {
    return getTableCellShared(row, columnName);
  }

  isGapTableColumn(column: DataElementTableColumn): boolean {
    return isGapColumn(column);
  }

  isGapTableColumnActive(column: DataElementTableColumn): boolean {
    const gapCell = this.getGapTableColumnCell(column);
    return gapCell ? this.isTableCheckCellChecked(gapCell) : false;
  }

  getGapTableColumnTitle(column: DataElementTableColumn): string {
    const gapCell = this.getGapTableColumnCell(column);
    return gapCell ? this.getTableCellLabel(gapCell) || column.label : column.label;
  }

  toggleGapTableColumn(column: DataElementTableColumn, event?: Event): void {
    if (!this.isGapTableColumn(column)) return;
    event?.stopPropagation();
    if (this.isValueLocked()) return;
    const gapCell = this.getGapTableColumnCell(column);
    if (!gapCell) return;
    this.toggleTableCheckCell(gapCell);
  }

  setGapTableColumnActive(column: DataElementTableColumn, event: Event): void {
    event.stopPropagation();
    const gapCell = this.getGapTableColumnCell(column);
    if (!gapCell) return;
    if (this.isValueLocked()) {
      if (event.target instanceof HTMLInputElement) event.target.checked = this.isTableCheckCellChecked(gapCell);
      return;
    }
    const checked =
      event.target instanceof HTMLInputElement ? event.target.checked : !this.isTableCheckCellChecked(gapCell);
    gapCell.value = checked ? 1 : 0;
    this.objectChange.notifyChanged(gapCell.identifier);
  }

  private getGapTableColumnCell(column: DataElementTableColumn): DataElement | null {
    this.tableRows();
    return findGapCellInColumn(this.element(), column);
  }

  getTableCellDisplayText(cell: DataElement): string {
    this.objectChange.versionOf(cell.identifier)();

    switch (cell.fieldType) {
      case DataElementFieldType.RESOURCE:
        return `${cell.currentValue}/${cell.value}${getCellUnit(cell)}`;
      case DataElementFieldType.CHECK:
        return getCellLabel(cell);
      case DataElementFieldType.CALC:
        return evaluateCalcElement(cell);
      case DataElementFieldType.IMAGE:
        return cell.value ? '画像未読込' : '';
      default:
        return String(cell.value ?? '')
          .replace(/\s+/g, ' ')
          .trim();
    }
  }

  getTableCellImageUrl(cell: DataElement): string {
    this.objectChange.versionOf(cell.identifier)();
    this.objectChange.fileVersion();
    const image = this.imageStorage.get(String(cell.value ?? ''));
    return image?.url ?? '';
  }

  getTableCellLabel(cell: DataElement): string {
    this.objectChange.versionOf(cell.identifier)();
    return getCellLabel(cell);
  }

  isTableCheckCellChecked(cell: DataElement): boolean {
    this.objectChange.versionOf(cell.identifier)();
    return isCheckCellChecked(cell);
  }

  toggleTableCheckCell(cell: DataElement, event?: Event): void {
    if (this.isValueLocked()) {
      if (event?.target instanceof HTMLInputElement) event.target.checked = this.isTableCheckCellChecked(cell);
      return;
    }
    cell.value = nextCheckCellValue(cell, event);
    this.objectChange.notifyChanged(cell.identifier);
  }

  getTableSelectOptions(cell: DataElement): string[] {
    this.objectChange.versionOf(cell.identifier)();
    return getSelectOptions(cell);
  }

  isTableSelectValueListed(cell: DataElement): boolean {
    this.objectChange.versionOf(cell.identifier)();
    return isSelectValueListed(cell);
  }

  setTableSelectCellValueFromEvent(cell: DataElement, event: Event): void {
    if (this.isValueLocked()) {
      if (event.target instanceof HTMLSelectElement) event.target.value = String(cell.value ?? '');
      return;
    }
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    cell.value = value;
    this.objectChange.notifyChanged(cell.identifier);
  }

  onTableWheel(event: WheelEvent): void {
    const scrollElement = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    if (!scrollElement || scrollElement.scrollWidth <= scrollElement.clientWidth) return;

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) return;

    const maxScrollLeft = scrollElement.scrollWidth - scrollElement.clientWidth;
    const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, scrollElement.scrollLeft + delta));
    if (nextScrollLeft === scrollElement.scrollLeft) return;

    event.preventDefault();
    scrollElement.scrollLeft = nextScrollLeft;
  }

  onJudgeCheckCellClick(row: DataElement, colName: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const element = this.element();
    const gapDistance = parseInt(element.getAttribute(DataElementAttribute.GAP_DISTANCE)) || 1;

    const rows = this.tableBodyRows();
    const allColumns = this.tableColumns();
    const techColumns = allColumns.filter((col) => !this.isGapTableColumn(col));
    const gapCostsBetweenCols = this.buildGapCostsBetweenCols(allColumns, gapDistance);

    const targetRowIndex = rows.indexOf(row);
    const targetColIndex = techColumns.findIndex((col) => col.name === colName);
    if (targetRowIndex < 0 || targetColIndex < 0) return;

    const candidates = findJudgementCandidates(
      rows,
      techColumns.map((col) => ({ name: col.name, label: col.label })),
      targetRowIndex,
      targetColIndex,
      (cell) => this.isTableCheckCellChecked(cell),
      5,
      {
        gapCostsBetweenCols,
        loopHorizontal: this.loopHorizontal(),
        loopVertical: this.loopVertical(),
      }
    );

    const clickedCell = this.getTableCell(row, colName);
    const fallbackLabel = techColumns.find((c) => c.name === colName)?.label ?? colName;
    const clickedCellLabel = clickedCell ? this.getTableCellLabel(clickedCell) || fallbackLabel : fallbackLabel;

    this.judgeCandidatesState.set({ clickedCellLabel, candidates });
  }

  private buildGapCostsBetweenCols(allColumns: DataElementTableColumn[], gapDistance: number): number[] {
    const techCols = allColumns.filter((c) => !this.isGapTableColumn(c));
    const costs: number[] = [];
    for (let ti = 0; ti < techCols.length - 1; ti++) {
      const idx1 = allColumns.findIndex((c) => c.name === techCols[ti].name);
      const idx2 = allColumns.findIndex((c) => c.name === techCols[ti + 1].name);
      let totalCost = 0;
      for (let k = idx1 + 1; k < idx2; k++) {
        if (this.isGapTableColumn(allColumns[k]) && this.isGapTableColumnActive(allColumns[k])) {
          totalCost += gapDistance;
        }
      }
      costs.push(totalCost);
    }
    return costs;
  }

  closeJudgeCandidates(): void {
    this.judgeCandidatesState.set(null);
  }

  sendCandidateToChat(candidate: SkillJudgementCandidate): void {
    const element = this.element();
    const baseDifficulty = parseInt(element.getAttribute(DataElementAttribute.BASE_DIFFICULTY)) || 5;
    const totalDifficulty = baseDifficulty + candidate.distance;
    this.uiSignalService.requestChatInputText(`2d6>=${totalDifficulty}`);
    this.judgeCandidatesState.set(null);
  }
}
