import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  type DataElementFieldTypeValue,
  DataElementRole,
  type DataElementRoleValue,
  DataElementViewMode,
} from '@axe/domain/data/data-element';
import { findJudgementCandidates, type SkillJudgementCandidate } from '@axe/domain/data/skill-table-judgement';
import { DataElementDragService } from '@axe/features/character/data-element-drag.service';
import { type CalcEnv, evalCalcFormula } from '@axe/features/character/game-data-element/game-data-element-calc';
import { FileSelecterComponent } from '@axe/shared/components/file-selecter/file-selecter.component';
import { LinkifyPipe } from '@axe/shared/pipes/linkify.pipe';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

type DataElementDropPosition = 'before' | 'after' | 'inside';
type DataElementTableColumn = { name: string; label: string; group: string; kind: string };
type DataElementTableColumnHeaderGroup = { key: string; label: string; span: number };

interface JudgeCandidatesState {
  /** クリックしたセルの技能名（表示用） */
  clickedCellLabel: string;
  candidates: SkillJudgementCandidate[];
}

@Component({
  selector: 'game-data-element, [game-data-element]',
  templateUrl: './game-data-element.component.html',
  styleUrls: [
    './game-data-element.component.css',
    './game-data-element-rows.css',
    './game-data-element-row-actions.css',
    './game-data-element-field-values.css',
    './game-data-element-sections.css',
    './game-data-element-judge.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LinkifyPipe, SafePipe, NgSelectComponent, NgOptionComponent],
  host: {
    '(dragover)': 'onStructureDragOver($event)',
    '(dragleave)': 'onStructureDragLeave($event)',
    '(drop)': 'onStructureDrop($event)',
    '[class.elm-editing]': 'isEdit() && !isImage()',
    '[class.elm-drop-before]': "structureDropPosition() === 'before'",
    '[class.elm-drop-after]': "structureDropPosition() === 'after'",
    '[class.elm-drop-inside]': "structureDropPosition() === 'inside'",
  },
})
export class GameDataElementComponent {
  private static readonly MAX_STANDARD_DEPTH = 3;

  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly dataElementDrag = inject(DataElementDragService);
  private readonly uiSignalService = inject(UiSignalService);

  readonly gameDataElement = input.required<DataElement>();
  readonly isEdit = input(false);
  readonly isTagLocked = input(false);
  readonly isValueLocked = input(false);

  readonly isImage = input(false);
  readonly indexNum = input(0);
  readonly depth = input(0);
  /** trueのとき最上位セクションのタイトルバーを非表示（ツールバー側に表示するため）*/
  readonly hideSectionTitle = input(false);

  readonly structureDropPosition = signal<DataElementDropPosition | null>(null);
  readonly fieldOptionsOpen = signal(false);
  readonly judgeCandidatesState = signal<JudgeCandidatesState | null>(null);
  private readonly _judgeActive = signal<boolean>(false);

  readonly tableRows = computed(() => {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    return element.children.filter((child) => child.children.length > 0);
  });

  readonly tableBodyRows = computed(() => this.tableRows().filter((row) => !this.isTableControlRow(row)));

  readonly canRenderTableRows = computed(() => {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    if (element.children.length < 1) return false;

    for (const row of element.children) {
      this.objectChange.versionOf(row.identifier)();
      if (row.fieldRole === DataElementRole.FIELD || row.children.length < 1) return false;
      for (const child of row.children) {
        this.objectChange.versionOf(child.identifier)();
        if (child.fieldRole !== DataElementRole.FIELD) return false;
      }
    }
    return true;
  });

  readonly tableColumns = computed<DataElementTableColumn[]>(() => {
    const columns: DataElementTableColumn[] = [];
    for (const row of this.tableRows()) {
      this.objectChange.versionOf(row.identifier)();
      for (const child of row.children) {
        this.objectChange.versionOf(child.identifier)();
        if (child.fieldRole !== DataElementRole.FIELD || columns.some((column) => column.name === child.name)) continue;
        columns.push(this.createTableColumn(child));
      }
    }
    return columns;
  });

  readonly hasTableColumnGroups = computed(() => this.tableColumns().some((column) => column.group.length > 0));

  readonly tableColumnHeaderGroups = computed<DataElementTableColumnHeaderGroup[]>(() => {
    const groups: DataElementTableColumnHeaderGroup[] = [];
    for (const [index, column] of this.tableColumns().entries()) {
      const label = column.group || column.label;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === label) {
        lastGroup.span += 1;
      } else {
        groups.push({ key: `${index}:${label}`, label, span: 1 });
      }
    }
    return groups;
  });

  readonly tableRowHeaderLabel = computed(() => {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    return element.getAttribute(DataElementAttribute.ROW_HEADER_LABEL).trim();
  });

  private createTableColumn(cell: DataElement): DataElementTableColumn {
    return {
      name: cell.name,
      label: cell.getAttribute(DataElementAttribute.COLUMN_LABEL).trim() || cell.name,
      group: cell.getAttribute(DataElementAttribute.COLUMN_GROUP).trim(),
      kind: cell.getAttribute(DataElementAttribute.CELL_KIND).trim(),
    };
  }

  private isTableControlRow(row: DataElement): boolean {
    this.objectChange.versionOf(row.identifier)();
    const hasGapCell = row.children.some((child) => {
      this.objectChange.versionOf(child.identifier)();
      return child.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap';
    });
    if (!hasGapCell) return false;

    return row.children.every((child) => {
      this.objectChange.versionOf(child.identifier)();
      if (child.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap') return true;
      return (
        String(child.value ?? '').trim() === '' && child.getAttribute(DataElementAttribute.CELL_TEXT).trim() === ''
      );
    });
  }

  private readonly _name = signal<string>('');
  get name(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this._name();
  }
  set name(name: string) {
    this._name.set(name);
    this.setUpdateTimer();
  }

  readonly isDuplicateName = computed(() => {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    return this.isDuplicateElementName(this._name(), element);
  });

  private readonly _value = signal<number | string>(0);
  get value(): number | string {
    return this._value();
  }
  set value(value: number | string) {
    this._value.set(value);
    this.setUpdateTimer();
  }

  private readonly _currentValue = signal<number | string>(0);
  get currentValue(): number | string {
    return this._currentValue();
  }
  set currentValue(currentValue: number | string) {
    this._currentValue.set(currentValue);
    this.setUpdateTimer();
  }

  /** セクションタイトル用 Material Icons 名 (cs-icon 属性) */
  get icon(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return (this.gameDataElement()?.getAttribute('cs-icon') as string) || '';
  }
  set icon(value: string) {
    const el = this.gameDataElement();
    if (el) el.setAttribute('cs-icon', value.trim());
  }

  get choicesText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.CHOICES);
  }
  set choicesText(value: string) {
    this.setFieldAttribute(DataElementAttribute.CHOICES, value);
  }

  get unitText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.UNIT);
  }
  set unitText(value: string) {
    this.setFieldAttribute(DataElementAttribute.UNIT, value);
  }

  get minText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.MIN);
  }
  set minText(value: string) {
    this.setFieldAttribute(DataElementAttribute.MIN, value);
  }

  get maxText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.MAX);
  }
  set maxText(value: string) {
    this.setFieldAttribute(DataElementAttribute.MAX, value);
  }

  get formulaText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.FORMULA);
  }
  set formulaText(value: string) {
    this.setFieldAttribute(DataElementAttribute.FORMULA, value);
  }

  get tableCellText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.CELL_TEXT);
  }
  set tableCellText(value: string) {
    this.setFieldAttribute(DataElementAttribute.CELL_TEXT, value);
  }

  get columnLabelText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.COLUMN_LABEL);
  }
  set columnLabelText(value: string) {
    this.setFieldAttribute(DataElementAttribute.COLUMN_LABEL, value);
  }

  get columnGroupText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.COLUMN_GROUP);
  }
  set columnGroupText(value: string) {
    this.setFieldAttribute(DataElementAttribute.COLUMN_GROUP, value);
  }

  get rowHeaderLabelText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.ROW_HEADER_LABEL);
  }
  set rowHeaderLabelText(value: string) {
    this.setFieldAttribute(DataElementAttribute.ROW_HEADER_LABEL, value);
  }

  get isGapCell(): boolean {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.CELL_KIND) === 'gap';
  }
  set isGapCell(value: boolean) {
    const element = this.gameDataElement();
    if (value) {
      element.setAttribute(DataElementAttribute.CELL_KIND, 'gap');
      if (!element.getAttribute(DataElementAttribute.COLUMN_LABEL).trim()) {
        element.setAttribute(DataElementAttribute.COLUMN_LABEL, 'G');
      }
    } else {
      element.removeAttribute(DataElementAttribute.CELL_KIND);
    }
    this.objectChange.notifyChanged(element.identifier);
  }

  /** Compute the calc field result from sibling/parent field values. */
  readonly calcResult = computed(() => {
    const el = this.gameDataElement();
    this.objectChange.versionOf(el.identifier)();
    return this.evaluateCalcElement(el);
  });

  private evaluateCalcElement(element: DataElement): string {
    const formula = element.getAttribute(DataElementAttribute.FORMULA);
    if (!formula) return '';
    const env = this.buildCalcEnv(element);
    const result = evalCalcFormula(formula, env);
    return Number.isNaN(result) ? '?' : String(result % 1 === 0 ? result : parseFloat(result.toFixed(4)));
  }

  private buildCalcEnv(self: DataElement): CalcEnv {
    const env: CalcEnv = {};
    const root = DataElement.getDetailNameScope(self);
    const entries: { name: string; path: string; value: number }[] = [];
    this.collectEnv(root, root, entries);

    const nameCounts = new Map<string, number>();
    for (const entry of entries) nameCounts.set(entry.name, (nameCounts.get(entry.name) ?? 0) + 1);
    for (const entry of entries) {
      env[entry.path] = entry.value;
      if (nameCounts.get(entry.name) === 1) env[entry.name] = entry.value;
    }
    return env;
  }

  private collectEnv(
    node: DataElement,
    root: DataElement,
    entries: { name: string; path: string; value: number }[]
  ): void {
    if (!node.children.length) {
      const num = Number(node.value);
      if (!Number.isNaN(num) && node.name) {
        entries.push({ name: node.name, path: DataElement.formatReferencePath(node, root), value: num });
      }
      return;
    }
    for (const child of node.children) this.collectEnv(child, root, entries);
  }

  readonly iconPickerOpen = signal(false);

  static readonly ICON_GROUPS: { label: string; icons: string[] }[] = [
    {
      label: 'キャラクター',
      icons: ['person', 'face', 'account_circle', 'groups', 'man', 'woman', 'child_care', 'elderly'],
    },
    {
      label: '戦闘',
      icons: [
        'shield',
        'security',
        'gavel',
        'sports_martial_arts',
        'local_fire_department',
        'bolt',
        'whatshot',
        'flash_on',
      ],
    },
    {
      label: 'ステータス',
      icons: ['favorite', 'health_and_safety', 'star', 'grade', 'bar_chart', 'trending_up', 'speed', 'military_tech'],
    },
    {
      label: 'アイテム',
      icons: ['inventory_2', 'backpack', 'category', 'sell', 'local_pharmacy', 'build', 'key', 'lock'],
    },
    {
      label: '魔法・能力',
      icons: ['auto_awesome', 'flare', 'nights_stay', 'wb_sunny', 'blur_on', 'casino', 'psychology', 'emoji_events'],
    },
    {
      label: 'メモ・情報',
      icons: ['info', 'note', 'description', 'edit_note', 'comment', 'chat', 'sticky_note_2', 'assignment'],
    },
  ];

  readonly iconGroups = GameDataElementComponent.ICON_GROUPS;

  readonly fieldTypeItems: { type: DataElementFieldTypeValue; label: string }[] = [
    { type: DataElementFieldType.TEXT, label: 'テキスト' },
    { type: DataElementFieldType.NUMBER, label: '数値' },
    { type: DataElementFieldType.RESOURCE, label: 'リソース' },
    { type: DataElementFieldType.LONG_TEXT, label: '長文' },
    { type: DataElementFieldType.CHECK, label: 'チェック' },
    { type: DataElementFieldType.SELECT, label: '選択' },
    { type: DataElementFieldType.CALC, label: '計算' },
    { type: DataElementFieldType.IMAGE, label: '画像' },
  ];

  selectIcon(name: string): void {
    this.icon = name;
    this.iconPickerOpen.set(false);
  }

  clearIcon(): void {
    this.icon = '';
    this.iconPickerOpen.set(false);
  }

  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    effect(() => {
      const element = this.gameDataElement();
      if (element) {
        this.objectChange.versionOf(element.identifier)();
        this.setValues(element);
      }
    });
  }

  readonly imageFileUrl = computed(() => {
    this.objectChange.fileVersion();
    const image = this.imageStorage.get(this._value() as string);
    return image ? image.url : '';
  });

  openModal(_name: string = '', isAllowedEmpty: boolean = false) {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: isAllowedEmpty }).then((value) => {
      if (!value) return;
      const element = this.gameDataElement();
      if (!element) return;
      element.value = value;
    });
  }

  updateKomaIconMaxValue(root: DataElement) {
    const image = root.getFirstElementByName('image');
    const icon = root.getElementsByName('ICON');
    if (icon) {
      icon[0].value = image!.children.length - 1;
      if (+icon[0].currentValue > +icon[0].value) icon[0].currentValue = icon[0].value;
    }
  }

  addImageElement() {
    this.gameDataElement().appendChild(DataElement.create('imageIdentifier', '', { type: 'image' }));
    this.updateKomaIconMaxValue(this.gameDataElement().parent as DataElement);
  }

  addElement() {
    const parentElement = this.gameDataElement();
    if (!this.canAddChildFieldElement()) return;

    const fieldElement = this.createFieldElement('タグ', parentElement);
    parentElement.appendChild(fieldElement);
    this.notifyStructureChanged(parentElement, fieldElement);
  }

  addSiblingElement() {
    const parentElement = this.getDataElementParent();
    if (!parentElement || !this.canAcceptChildRole(parentElement, DataElementRole.FIELD)) return;

    const fieldElement = this.createFieldElement('タグ', parentElement);
    this.insertElementAfter(fieldElement, this.gameDataElement(), parentElement);
    this.notifyStructureChanged(parentElement, fieldElement);
  }

  addGroupElement() {
    const parentElement = this.gameDataElement();
    if (!this.canAddChildGroupElement()) return;

    const groupElement = this.createContainerElement(DataElementRole.GROUP, 'グループ', parentElement);
    parentElement.appendChild(groupElement);
    this.notifyStructureChanged(parentElement, groupElement);
  }

  canAddChildGroupElement(): boolean {
    return this.canAcceptChildRole(this.gameDataElement(), DataElementRole.GROUP);
  }

  canAddChildFieldElement(): boolean {
    return this.canAcceptChildRole(this.gameDataElement(), DataElementRole.FIELD);
  }

  canAddSiblingFieldElement(): boolean {
    const parentElement = this.getDataElementParent();
    return !!parentElement && this.canAcceptChildRole(parentElement, DataElementRole.FIELD);
  }

  private createContainerElement(
    role: typeof DataElementRole.SECTION | typeof DataElementRole.GROUP,
    name: string,
    parentElement: DataElement = this.gameDataElement(),
    reservedNames: Set<string> = new Set()
  ) {
    const uniqueName = DataElement.createUniqueSiblingName(parentElement, name, '', reservedNames);
    reservedNames.add(uniqueName);

    const containerElement = DataElement.create(uniqueName, '', {
      [DataElementAttribute.ROLE]: role,
    });
    if (role === DataElementRole.SECTION)
      containerElement.appendChild(this.createContainerElement(DataElementRole.GROUP, 'グループ', containerElement));
    else containerElement.appendChild(this.createFieldElement('タグ', containerElement));
    return containerElement;
  }

  private createFieldElement(
    name: string = 'タグ',
    parentElement: DataElement = this.gameDataElement(),
    reservedNames: Set<string> = new Set()
  ): DataElement {
    const uniqueName = DataElement.createUniqueSiblingName(parentElement, name, '', reservedNames);
    reservedNames.add(uniqueName);

    return DataElement.create(uniqueName, '', {
      [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.TEXT,
      [DataElementAttribute.ROLE]: DataElementRole.FIELD,
    });
  }

  onStructureDragStart(event: DragEvent): void {
    if (!this.isEdit() || this.isImage()) return;
    this.dataElementDrag.start(event, this.gameDataElement().identifier);
    event.stopPropagation();
  }

  onStructureDragEnd(event?: DragEvent): void {
    this.dataElementDrag.end();
    this.structureDropPosition.set(null);
    event?.stopPropagation();
  }

  onStructureDragOver(event: DragEvent): void {
    const draggedElement = this.getDraggedElement(event);
    if (!draggedElement) return;

    const targetElement = this.gameDataElement();
    const position = this.resolveDropPosition(event, targetElement);
    if (!this.canDropStructureElement(draggedElement, targetElement, position)) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.structureDropPosition.set(position);
  }

  onStructureDragLeave(event: DragEvent): void {
    // Only clear the indicator when the cursor truly left this host element.
    // dragleave also fires when the cursor moves into a child element (event bubbles up),
    // so we check relatedTarget to distinguish the two cases.
    const host = event.currentTarget as HTMLElement | null;
    if (host && event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) return;
    this.structureDropPosition.set(null);
    event.stopPropagation();
  }

  onStructureDrop(event: DragEvent): void {
    const draggedElement = this.getDraggedElement(event);
    const targetElement = this.gameDataElement();
    const position = this.structureDropPosition() ?? this.resolveDropPosition(event, targetElement);

    this.structureDropPosition.set(null);
    this.dataElementDrag.end();
    if (!draggedElement || !this.canDropStructureElement(draggedElement, targetElement, position)) return;

    event.preventDefault();
    event.stopPropagation();
    this.moveStructureElement(draggedElement, targetElement, position);
  }

  private getDraggedElement(event: DragEvent): DataElement | null {
    const draggedId = this.dataElementDrag.getDraggedId(event);
    if (!draggedId) return null;
    return this.objectStore.get<DataElement>(draggedId) ?? null;
  }

  private resolveDropPosition(event: DragEvent, targetElement: DataElement): DataElementDropPosition {
    const currentTarget = event.currentTarget as HTMLElement | null;
    const rect = currentTarget?.getBoundingClientRect();
    if (!rect || rect.height <= 0) return this.canDropInside(targetElement) ? 'inside' : 'after';

    const edgeSize = Math.min(12, rect.height * 0.28);
    const offsetY = event.clientY - rect.top;
    if (offsetY <= edgeSize) return 'before';
    if (offsetY >= rect.height - edgeSize) return 'after';
    return this.canDropInside(targetElement) ? 'inside' : 'after';
  }

  private canDropStructureElement(
    draggedElement: DataElement,
    targetElement: DataElement,
    position: DataElementDropPosition
  ): boolean {
    if (!this.isEdit() || this.isImage()) return false;
    if (draggedElement === targetElement) return false;

    const newDepth = position === 'inside' ? this.depth() + 1 : this.depth();
    if (newDepth + this.getSubtreeDepth(draggedElement) > GameDataElementComponent.MAX_STANDARD_DEPTH) return false;

    if (position === 'inside') {
      return (
        this.canDropInside(targetElement) &&
        this.canAcceptChild(targetElement, draggedElement) &&
        !draggedElement.contains(targetElement)
      );
    }

    const parent = targetElement.parent;
    return (
      parent instanceof DataElement && this.canAcceptChild(parent, draggedElement) && !draggedElement.contains(parent)
    );
  }

  private canDropInside(targetElement: DataElement): boolean {
    return targetElement.fieldRole !== DataElementRole.FIELD;
  }

  private canAcceptChild(parentElement: DataElement, childElement: DataElement): boolean {
    return this.canAcceptChildRole(parentElement, childElement.fieldRole);
  }

  private canAcceptChildRole(parentElement: DataElement, childRole: DataElementRoleValue): boolean {
    if (parentElement.name === 'detail') return childRole === DataElementRole.SECTION;
    if (parentElement.fieldRole === DataElementRole.SECTION) return childRole === DataElementRole.GROUP;
    if (parentElement.fieldRole === DataElementRole.GROUP) {
      if (childRole === DataElementRole.FIELD) return true;
      if (childRole === DataElementRole.GROUP) {
        return this.getElementDepth(parentElement) < GameDataElementComponent.MAX_STANDARD_DEPTH - 1;
      }
    }
    return false;
  }

  private getElementDepth(element: DataElement): number {
    let depth = 0;
    let parent = element.parent;
    while (parent instanceof DataElement && parent.name !== 'detail') {
      depth++;
      parent = parent.parent;
    }
    return depth;
  }

  private getDataElementParent(element: DataElement = this.gameDataElement()): DataElement | null {
    const parent = element.parent;
    return parent instanceof DataElement ? parent : null;
  }

  private getSubtreeDepth(element: DataElement): number {
    let depth = 0;
    for (const child of element.children) {
      depth = Math.max(depth, this.getSubtreeDepth(child) + 1);
    }
    return depth;
  }

  private moveStructureElement(
    draggedElement: DataElement,
    targetElement: DataElement,
    position: DataElementDropPosition
  ): void {
    const oldParent = draggedElement.parent as DataElement | null;
    let newParent: DataElement;

    if (position === 'inside') {
      newParent = targetElement;
      newParent.appendChild(draggedElement);
    } else {
      const parent = targetElement.parent;
      if (!(parent instanceof DataElement)) return;
      newParent = parent;

      if (position === 'before') {
        newParent.insertBefore(draggedElement, targetElement);
      } else {
        this.insertElementAfter(draggedElement, targetElement, newParent);
      }
    }

    draggedElement.syncFieldRoleToHierarchy();
    draggedElement.update();
    this.notifyStructureChanged(newParent, draggedElement, oldParent ?? undefined);
  }

  private insertElementAfter(element: DataElement, targetElement: DataElement, parentElement: DataElement): void {
    const targetIndex = parentElement.children.indexOf(targetElement);
    const nextElement = parentElement.children[targetIndex + 1];
    if (nextElement) parentElement.insertBefore(element, nextElement);
    else parentElement.appendChild(element);
  }

  private notifyStructureChanged(...elements: (DataElement | undefined)[]): void {
    const notifiedIds = new Set<string>();
    for (const element of elements) {
      if (!element || notifiedIds.has(element.identifier)) continue;
      element.update();
      this.objectChange.notifyChanged(element.identifier);
      notifiedIds.add(element.identifier);
    }
  }

  deleteElement() {
    this.gameDataElement().destroy();
  }

  deleteImageElement() {
    const root: DataElement = this.gameDataElement().parent!.parent as DataElement;
    if (this.gameDataElement().parent!.children[0] != this.gameDataElement()) {
      this.gameDataElement().destroy();
      this.updateKomaIconMaxValue(root);
    }
  }

  setElementType(type: string) {
    const element = this.gameDataElement();
    element.setAttribute('type', type);
    element.setFieldType(DataElement.fieldTypeFromDataType(type));
  }

  setElementFieldType(fieldType: DataElementFieldTypeValue) {
    const element = this.gameDataElement();
    element.setFieldType(fieldType);
    element.setAttribute('type', DataElement.dataTypeFromFieldType(fieldType));
    this.fieldOptionsOpen.set(false);
  }

  getSelectOptions(): string[] {
    const choices = this.gameDataElement().getAttribute(DataElementAttribute.CHOICES);
    return this.parseSelectOptions(choices);
  }

  getTableSelectOptions(cell: DataElement): string[] {
    this.objectChange.versionOf(cell.identifier)();
    return this.parseSelectOptions(cell.getAttribute(DataElementAttribute.CHOICES));
  }

  isTableSelectValueListed(cell: DataElement): boolean {
    return this.getTableSelectOptions(cell).includes(String(cell.value ?? ''));
  }

  setTableSelectCellValue(cell: DataElement, value: string): void {
    cell.value = value;
    this.objectChange.notifyChanged(cell.identifier);
  }

  setTableSelectCellValueFromEvent(cell: DataElement, event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    this.setTableSelectCellValue(cell, value);
  }

  private parseSelectOptions(choices: string): string[] {
    return choices
      .split(/\r?\n|,/)
      .map((choice) => choice.trim())
      .filter((choice) => choice.length > 0);
  }

  shouldShowFieldOptions(): boolean {
    if (!this.isEdit() || this.isImage()) return false;
    const fieldType = this.gameDataElement().fieldType;
    return (
      this.isTableCellField() ||
      fieldType === DataElementFieldType.SELECT ||
      fieldType === DataElementFieldType.NUMBER ||
      fieldType === DataElementFieldType.RESOURCE ||
      fieldType === DataElementFieldType.CALC
    );
  }

  shouldShowContainerOptions(): boolean {
    return (
      this.isEdit() &&
      !this.isImage() &&
      this.gameDataElement().fieldRole !== DataElementRole.FIELD &&
      this.isTableViewMode()
    );
  }

  toggleFieldOptions(): void {
    this.fieldOptionsOpen.update((isOpen) => !isOpen);
  }

  isTableCellField(): boolean {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    if (element.fieldRole !== DataElementRole.FIELD) return false;

    const rowElement = element.parent instanceof DataElement ? element.parent : null;
    const tableElement = rowElement?.parent instanceof DataElement ? rowElement.parent : null;
    if (rowElement) this.objectChange.versionOf(rowElement.identifier)();
    if (tableElement) this.objectChange.versionOf(tableElement.identifier)();
    return rowElement?.fieldRole === DataElementRole.GROUP && tableElement?.viewMode === DataElementViewMode.TABLE;
  }

  copyReferencePath(event?: MouseEvent): void {
    event?.stopPropagation();
    const referencePath = DataElement.formatReferencePath(this.gameDataElement());
    if (!referencePath) return;
    void navigator.clipboard?.writeText(referencePath);
  }

  isPopupDataElement(): boolean {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    return element.getAttribute(DataElementAttribute.POPUP) === 'true';
  }

  togglePopupDataElement(event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.isImage()) return;
    const element = this.gameDataElement();
    if (this.isPopupDataElement()) element.removeAttribute(DataElementAttribute.POPUP);
    else element.setAttribute(DataElementAttribute.POPUP, 'true');
    this.objectChange.notifyChanged(element.identifier);
  }

  canToggleTableViewMode(): boolean {
    return !this.isImage() && this.gameDataElement().fieldRole !== DataElementRole.FIELD;
  }

  isTableViewMode(): boolean {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    return element.viewMode === DataElementViewMode.TABLE;
  }

  toggleTableViewMode(): void {
    if (!this.canToggleTableViewMode()) return;
    const element = this.gameDataElement();
    element.setViewMode(this.isTableViewMode() ? DataElementViewMode.NORMAL : DataElementViewMode.TABLE);
    this.objectChange.notifyChanged(element.identifier);
  }

  /** GAP判定テーブルとして設定されているか（属性フラグ） */
  isJudgeModeEnabled(): boolean {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    return element.getAttribute(DataElementAttribute.JUDGE_MODE) === 'true';
  }

  /** 編集モード: GAP判定テーブル設定フラグをトグル */
  toggleJudgeModeEnabled(): void {
    const element = this.gameDataElement();
    if (this.isJudgeModeEnabled()) element.removeAttribute(DataElementAttribute.JUDGE_MODE);
    else element.setAttribute(DataElementAttribute.JUDGE_MODE, 'true');
    this.objectChange.notifyChanged(element.identifier);
    // 設定をオフにした場合はアクティブ状態もリセット
    if (!this.isJudgeModeEnabled()) this._judgeActive.set(false);
  }

  /** 現在、判定算出モードで動作中か（ビューモードのトグル状態） */
  isJudgeMode(): boolean {
    return this.isJudgeModeEnabled() && this._judgeActive();
  }

  /** ビューモード: 判定算出 / 技能習得をトグル */
  toggleJudgeActive(): void {
    this._judgeActive.update((v) => !v);
    this.judgeCandidatesState.set(null);
  }

  get gapDistanceText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.GAP_DISTANCE);
  }
  set gapDistanceText(value: string) {
    this.setFieldAttribute(DataElementAttribute.GAP_DISTANCE, value);
  }

  get baseDifficultyText(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.BASE_DIFFICULTY);
  }
  set baseDifficultyText(value: string) {
    this.setFieldAttribute(DataElementAttribute.BASE_DIFFICULTY, value);
  }

  get loopHorizontal(): boolean {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.LOOP_HORIZONTAL) === 'true';
  }
  toggleLoopHorizontal(): void {
    const element = this.gameDataElement();
    if (this.loopHorizontal) element.removeAttribute(DataElementAttribute.LOOP_HORIZONTAL);
    else element.setAttribute(DataElementAttribute.LOOP_HORIZONTAL, 'true');
    this.objectChange.notifyChanged(element.identifier);
  }

  get loopVertical(): boolean {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this.gameDataElement().getAttribute(DataElementAttribute.LOOP_VERTICAL) === 'true';
  }
  toggleLoopVertical(): void {
    const element = this.gameDataElement();
    if (this.loopVertical) element.removeAttribute(DataElementAttribute.LOOP_VERTICAL);
    else element.setAttribute(DataElementAttribute.LOOP_VERTICAL, 'true');
    this.objectChange.notifyChanged(element.identifier);
  }

  onJudgeCheckCellClick(row: DataElement, colName: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const element = this.gameDataElement();
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
        loopHorizontal: this.loopHorizontal,
        loopVertical: this.loopVertical,
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

  sendCandidateToChat(candidate: SkillJudgementCandidate, event: Event): void {
    event.stopPropagation();
    const element = this.gameDataElement();
    const baseDifficulty = parseInt(element.getAttribute(DataElementAttribute.BASE_DIFFICULTY)) || 5;
    const totalDifficulty = baseDifficulty + candidate.distance;
    this.uiSignalService.requestChatInputText(`2d6>=${totalDifficulty}`);
    this.judgeCandidatesState.set(null);
  }

  shouldRenderTableView(): boolean {
    return (
      !this.isEdit() &&
      this.isTableViewMode() &&
      this.canRenderTableRows() &&
      this.tableBodyRows().length > 0 &&
      this.tableColumns().length > 0
    );
  }

  getTableCell(row: DataElement, columnName: string): DataElement | null {
    return row.children.find((child) => child.fieldRole === DataElementRole.FIELD && child.name === columnName) ?? null;
  }

  isGapTableColumn(column: DataElementTableColumn): boolean {
    return column.kind === 'gap';
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
    const gapCell = this.getGapTableColumnCell(column);
    if (!gapCell) return;
    this.toggleTableCheckCell(gapCell);
  }

  setGapTableColumnActive(column: DataElementTableColumn, event: Event): void {
    event.stopPropagation();
    const gapCell = this.getGapTableColumnCell(column);
    if (!gapCell) return;
    const checked =
      event.target instanceof HTMLInputElement ? event.target.checked : !this.isTableCheckCellChecked(gapCell);
    gapCell.value = checked ? 1 : 0;
    this.objectChange.notifyChanged(gapCell.identifier);
  }

  private getGapTableColumnCell(column: DataElementTableColumn): DataElement | null {
    if (!this.isGapTableColumn(column)) return null;
    for (const row of this.tableRows()) {
      const cell = this.getTableCell(row, column.name);
      if (cell?.getAttribute(DataElementAttribute.CELL_KIND).trim() === 'gap') return cell;
    }
    return null;
  }

  getTableCellText(row: DataElement, columnName: string): string {
    const cell = this.getTableCell(row, columnName);
    if (!cell) return '';
    return this.getTableCellDisplayText(cell);
  }

  getTableCellDisplayText(cell: DataElement): string {
    this.objectChange.versionOf(cell.identifier)();

    switch (cell.fieldType) {
      case DataElementFieldType.RESOURCE:
        return `${cell.currentValue}/${cell.value}${this.getTableCellUnit(cell)}`;
      case DataElementFieldType.CHECK:
        return this.getTableCellLabel(cell);
      case DataElementFieldType.CALC:
        return this.evaluateCalcElement(cell);
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
    return cell.getAttribute(DataElementAttribute.CELL_TEXT).trim();
  }

  isTableCheckCellChecked(cell: DataElement): boolean {
    this.objectChange.versionOf(cell.identifier)();
    const value = String(cell.value).trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'x' || value === 'checked';
  }

  toggleTableCheckCell(cell: DataElement, event?: Event): void {
    const checked =
      event?.target instanceof HTMLInputElement ? event.target.checked : !this.isTableCheckCellChecked(cell);
    cell.value = checked ? 1 : 0;
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

  private getTableCellUnit(cell: DataElement): string {
    const unit = cell.getAttribute(DataElementAttribute.UNIT).trim();
    return unit ? ` ${unit}` : '';
  }

  private setFieldAttribute(attribute: string, value: string): void {
    const element = this.gameDataElement();
    const normalizedValue = value.trim();
    if (normalizedValue.length > 0) element.setAttribute(attribute, normalizedValue);
    else element.removeAttribute(attribute);
    this.objectChange.notifyChanged(element.identifier);
  }

  private setValues(object: DataElement) {
    this._name.set(object.name);
    this._currentValue.set(object.currentValue);
    this._value.set(object.value);
  }

  private setUpdateTimer() {
    clearTimeout(this.updateTimer ?? undefined);
    this.updateTimer = setTimeout(() => {
      const element = this.gameDataElement();
      const nextName = this.name.trim();
      if (element.name !== nextName) {
        if (this.isDuplicateElementName(nextName, element)) {
          this._name.set(element.name);
        } else {
          element.name = nextName;
        }
      }
      if (element.currentValue !== this.currentValue) element.currentValue = this.currentValue;
      if (element.value !== this.value) element.value = this.value;
      this.updateTimer = null;
    }, 66);
  }

  private isDuplicateElementName(name: string, element: DataElement): boolean {
    const parentElement = this.getDataElementParent(element);
    return !!parentElement && DataElement.hasSiblingName(parentElement, name, element.identifier);
  }

  escapeHtml(text: string | number): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  isUrlText(text: string | number): boolean {
    if (typeof text !== 'string') return false;
    return text.startsWith('https://') || text.startsWith('http://');
  }

  protected editCheckedIds = new Set<string>();

  isEditUrl(dataElmIdentifier: string) {
    return this.editCheckedIds.has(dataElmIdentifier);
  }

  changeChk(dataElmIdentifier: string) {
    if (this.editCheckedIds.has(dataElmIdentifier)) {
      this.editCheckedIds.delete(dataElmIdentifier);
    } else {
      this.editCheckedIds.add(dataElmIdentifier);
    }
  }

  textFocus(dataElmIdentifier: string) {
    this.editCheckedIds.add(dataElmIdentifier);
  }

  onSetElementType(value: string): void {
    this.setElementType(value ?? '');
  }

  onSetFieldType(value: DataElementFieldTypeValue): void {
    this.setElementFieldType(value ?? DataElementFieldType.TEXT);
  }
}
