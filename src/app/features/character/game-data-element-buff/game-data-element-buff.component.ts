import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';

@Component({
  selector: 'game-data-element-buff, [game-data-element-buff]',
  templateUrl: './game-data-element-buff.component.html',
  styles: [
    `
      .game-data-element {
        margin-left: 10px;
      }
      .table {
        display: table;
        width: 100%;
        box-sizing: border-box;
      }
      .table-row {
        padding-top: 10px;
        display: table-row;
        box-sizing: border-box;
      }

      .table-cell-2 {
        display: table-cell;
        vertical-align: middle;
        padding: 0em 0em 0em 0em;
      }

      .table-cell {
        display: table-cell;
        vertical-align: bottom;
        padding: 0.5em 0em 0.1em 0.5em;
        border-bottom: 1px dotted #888;
        box-sizing: border-box;
      }
      .table-cell_solid {
        width: 10px;
        white-space: nowrap;
      }
      .table-cell_inner-table {
        display: table-cell;
        vertical-align: bottom;
        padding: 0.2em 0em 0.1em 0.5em;
        border: none;
        box-sizing: border-box;
      }
      .table-cell_inner-table-title {
        border-bottom: 1px solid #444;
        border-left: 8px solid #444;
        padding-left: 8px;
      }
      .box {
        display: inline-block;
        margin: 10px;
      }
      .hidden-spacer {
        visibility: hidden;
        height: 0;
        max-width: 20em;
        overflow: hidden;
        padding: 0 3px;
        box-sizing: border-box;
      }

      input,
      textarea,
      select {
        background: none;
        border: none;
        border-radius: 2px;
        outline: none;

        color: #444;
        font-family: Cambria, Georgia;
        font-size: 1em;
        padding: 2px;
        box-sizing: border-box;
      }

      .inputLock {
        background: none;
        border: none;
        border-radius: 2px;
        outline: none;

        color: #444;
        font-family: Cambria, Georgia;
        font-size: 1em;
        padding: 2px;
        box-sizing: border-box;
        width: 100%;
        min-width: 10px;
        font-weight: bold;
      }

      input:hover,
      textarea:hover,
      select:hover {
        background: #eee;
      }
      input:focus,
      textarea:focus,
      select:focus {
        background: #fff;
      }
      button i {
        font-size: 1rem;
      }

      button:hover {
        background: #444;
        color: #ccc;
      }

      .table-cell button {
        font-size: 0.5rem;
      }
    `,
  ],
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
