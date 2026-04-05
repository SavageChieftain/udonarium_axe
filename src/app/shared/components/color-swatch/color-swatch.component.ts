import { ColorPicker } from '@acrodata/color-picker';
import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

const DEFAULT_PRESETS = [
  '#000000',
  '#FF0000',
  '#999999',
  '#990000',
  '#FF6633',
  '#669933',
  '#00CC33',
  '#009966',
  '#33CCFF',
  '#0099FF',
  '#3366FF',
  '#003399',
  '#9933CC',
  '#663366',
  '#FF66FF',
];

@Component({
  selector: 'color-swatch',
  templateUrl: './color-swatch.component.html',
  styleUrls: ['./color-swatch.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ColorPicker],
})
export class ColorSwatchComponent {
  @Input() value = '#000000';
  @Input() presets: string[] = DEFAULT_PRESETS;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  readonly showPicker = signal(false);

  get isCustomColor(): boolean {
    return !this.presets.some((c) => c.toLowerCase() === this.value.toLowerCase());
  }

  selectPreset(color: string): void {
    if (this.disabled) return;
    this.showPicker.set(false);
    this.value = color;
    this.valueChange.emit(color);
  }

  togglePicker(): void {
    if (this.disabled) return;
    this.showPicker.set(!this.showPicker());
  }

  onPickerChange(color: string): void {
    this.value = color;
    this.valueChange.emit(color);
  }
}
