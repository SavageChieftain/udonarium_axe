import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';
import { MarkDown } from '@axe/domain/data/mark-down';
import { FileSelecterComponent } from '@axe/shared/components/file-selecter/file-selecter.component';
import { LinkifyPipe } from '@axe/shared/pipes/linkify.pipe';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelService } from '@axe/shared/ui/panel.service';
import { NgOptionComponent, NgSelectComponent } from '@ng-select/ng-select';

@Component({
  selector: 'game-data-element, [game-data-element]',
  templateUrl: './game-data-element.component.html',
  styleUrls: ['./game-data-element.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LinkifyPipe, SafePipe, NgSelectComponent, NgOptionComponent],
  host: {
    '(click)': 'click($event)',
  },
})
export class GameDataElementComponent {
  private readonly panelService = inject(PanelService);
  private readonly modalService = inject(ModalService);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly objectStore = inject(ObjectStore);
  private readonly imageStorage = inject(ImageStorage);
  private readonly objectChange = inject(ObjectChangeService);

  readonly gameDataElement = input.required<DataElement>();
  readonly isEdit = input(false);
  readonly isTagLocked = input(false);
  readonly isValueLocked = input(false);

  readonly isImage = input(false);
  readonly indexNum = input(0);
  /** trueのとき最上位セクションのタイトルバーを非表示（ツールバー側に表示するため）*/
  readonly hideSectionTitle = input(false);

  private readonly _name = signal<string>('');
  get name(): string {
    if (this.gameDataElement()) this.objectChange.versionOf(this.gameDataElement().identifier)();
    return this._name();
  }
  set name(name: string) {
    this._name.set(name);
    this.setUpdateTimer();
  }

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
    this.gameDataElement().appendChild(DataElement.create('タグ', '', {}));
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

  upElement() {
    const parentElement = this.gameDataElement().parent!;
    const index: number = parentElement.children.indexOf(this.gameDataElement());
    if (index > 0) {
      const prevElement = parentElement.children[index - 1];
      parentElement.insertBefore(this.gameDataElement(), prevElement);
    }
  }

  downElement() {
    const parentElement = this.gameDataElement().parent!;
    const index: number = parentElement.children.indexOf(this.gameDataElement());
    if (index < parentElement.children.length - 1) {
      if (index < parentElement.children.length - 2) {
        parentElement.insertBefore(this.gameDataElement(), parentElement.children[index + 2]);
      } else {
        parentElement.appendChild(this.gameDataElement());
      }
    }
  }

  setElementType(type: string) {
    this.gameDataElement().setAttribute('type', type);
  }

  private setValues(object: DataElement) {
    this._name.set(object.name);
    this._currentValue.set(object.currentValue);
    this._value.set(object.value);
  }

  private setUpdateTimer() {
    clearTimeout(this.updateTimer ?? undefined);
    this.updateTimer = setTimeout(() => {
      if (this.gameDataElement().name !== this.name) this.gameDataElement().name = this.name;
      if (this.gameDataElement().currentValue !== this.currentValue)
        this.gameDataElement().currentValue = this.currentValue;
      if (this.gameDataElement().value !== this.value) this.gameDataElement().value = this.value;
      this.updateTimer = null;
    }, 66);
  }

  escapeHtml(text: string | number): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  get markdown(): MarkDown {
    // 'markdwon' is the legacy identifier; keep as fallback for old peers in P2P sessions
    return (this.objectStore.get<MarkDown>('markdown') ?? this.objectStore.get<MarkDown>('markdwon'))!;
  }

  escapeHtmlMarkDown(text: string | number, baseId: string): SafeHtml {
    text = String(text);
    const textCheckBox = this.markdown.markDownCheckBox(text, baseId);
    const textTable = this.markdown.markDownTable(textCheckBox);

    return this.domSanitizer.bypassSecurityTrustHtml('<div>' + textTable + '</div>');
  }

  click(event: MouseEvent) {
    if (this.markdown) {
      this.markdown.changeMarkDownCheckBox((event.target as HTMLElement)?.id, event.timeStamp);
    }
  }

  protected editCheckedIds = new Set<string>();

  isEditMarkDown(dataElmIdentifier: string) {
    return this.editCheckedIds.has(dataElmIdentifier);
  }

  isEditUrl(dataElmIdentifier: string) {
    return this.editCheckedIds.has(dataElmIdentifier);
  }

  isUrlText(text: string | number): boolean {
    if (typeof text !== 'string') return false;
    if (text.match(/^https:\/\//)) return true;
    if (text.match(/^http:\/\//)) return true;
    return false;
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
}
