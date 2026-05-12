import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';

@Component({
  selector: 'game-data-element-buff, [game-data-element-buff]',
  templateUrl: './game-data-element-buff.component.html',
  styleUrls: ['./game-data-element-buff.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class GameDataElementBuffComponent {
  private readonly objectChange = inject(ObjectChangeService);

  readonly gameDataElement = input.required<DataElement>();
  readonly isEdit = input(false);
  readonly isTagLocked = input(false);
  readonly isValueLocked = input(false);
  readonly isPieceMode = input(false);

  /** 子要素数を返す Signal。children 追加/削除をリアクティブに追跡する。 */
  protected readonly childrenCount = computed<number>(() => {
    const element = this.gameDataElement();
    this.objectChange.versionOf(element.identifier)();
    return element.children.length;
  });

  private readonly _name = signal<string>('');
  get name(): string {
    this.objectChange.versionOf(this.gameDataElement().identifier)();
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

  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    effect(() => {
      const element = this.gameDataElement();
      this.objectChange.versionOf(element.identifier)();
      this.setValues(element);
    });
  }

  addElement() {
    this.gameDataElement().appendChild(
      DataElement.create('TEST', 8, { type: DataElementType.NUMBER_RESOURCE, currentValue: '001' }, 'TEST')
    ); // + '_' + character.identifier
  }

  deleteElement() {
    this.gameDataElement().destroy();
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
      const nextElement = parentElement.children[index + 1];
      parentElement.insertBefore(nextElement, this.gameDataElement());
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

  deletBuff(data: DataElement) {
    data.destroy();
  }
}
