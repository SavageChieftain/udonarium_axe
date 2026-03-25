import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DataElement, DataElementType } from '@axe/domain/data/data-element';
import { ObjectChangeService } from '@axe/shared/object-change.service';
import { filter } from 'rxjs';

@Component({
  selector: 'game-data-element-buff, [game-data-element-buff]',
  templateUrl: './game-data-element-buff.component.html',
  styleUrls: ['./game-data-element-buff.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class GameDataElementBuffComponent implements OnInit, OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  @Input() gameDataElement: DataElement = null!;
  @Input() isEdit: boolean = false;
  @Input() isTagLocked: boolean = false;
  @Input() isValueLocked: boolean = false;
  @Input() isPieceMode: boolean = false;

  private _name: string = '';
  get name(): string {
    return this._name;
  }
  set name(name: string) {
    this._name = name;
    this.setUpdateTimer();
  }

  private _value: number | string = 0;
  get value(): number | string {
    return this._value;
  }
  set value(value: number | string) {
    this._value = value;
    this.setUpdateTimer();
  }

  private _currentValue: number | string = 0;
  get currentValue(): number | string {
    return this._currentValue;
  }
  set currentValue(currentValue: number | string) {
    this._currentValue = currentValue;
    this.setUpdateTimer();
  }

  private updateTimer: NodeJS.Timeout = null!;
  ngOnInit() {
    if (this.gameDataElement) this.setValues(this.gameDataElement);

    this.objectChange.objectChanged$
      .pipe(
        filter((e) => !!this.gameDataElement && e.identifier === this.gameDataElement.identifier),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.setValues(this.gameDataElement);
        this.changeDetector.markForCheck();
      });

    this.objectChange.objectDeleted$
      .pipe(
        filter((e) => !!this.gameDataElement && this.gameDataElement.identifier === e.identifier),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.changeDetector.markForCheck();
      });
  }

  ngOnDestroy() {}

  ngAfterViewInit() {}

  addElement() {
    this.gameDataElement.appendChild(
      DataElement.create('TEST', 8, { type: DataElementType.NUMBER_RESOURCE, currentValue: '001' }, 'TEST')
    ); // + '_' + character.identifier
  }

  deleteElement() {
    this.gameDataElement.destroy();
  }

  upElement() {
    const parentElement = this.gameDataElement.parent;
    const index: number = parentElement.children.indexOf(this.gameDataElement);
    if (0 < index) {
      const prevElement = parentElement.children[index - 1];
      parentElement.insertBefore(this.gameDataElement, prevElement);
    }
  }

  downElement() {
    const parentElement = this.gameDataElement.parent;
    const index: number = parentElement.children.indexOf(this.gameDataElement);
    if (index < parentElement.children.length - 1) {
      const nextElement = parentElement.children[index + 1];
      parentElement.insertBefore(nextElement, this.gameDataElement);
    }
  }

  setElementType(type: string) {
    this.gameDataElement.setAttribute('type', type);
  }

  private setValues(object: DataElement) {
    this._name = object.name;
    this._currentValue = object.currentValue;
    this._value = object.value;
  }

  private setUpdateTimer() {
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      if (this.gameDataElement.name !== this.name) this.gameDataElement.name = this.name;
      if (this.gameDataElement.currentValue !== this.currentValue)
        this.gameDataElement.currentValue = this.currentValue;
      if (this.gameDataElement.value !== this.value) this.gameDataElement.value = this.value;
      this.updateTimer = null!;
    }, 66);
  }

  deletBuff(data: DataElement) {
    data.destroy();
  }
}
