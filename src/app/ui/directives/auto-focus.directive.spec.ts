import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutoFocusDirective } from '@axe/ui/directives/auto-focus.directive';

@Component({
  imports: [AutoFocusDirective],
  template: `<input appAutoFocus [value]="text" /><button type="button">elsewhere</button>`,
})
class HostComponent {
  text = '第1話';
}

describe('AutoFocusDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('hands the caret to what it is put on', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(document.activeElement).toBe(input);
  });

  it('takes what is already there so typing replaces it', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('第1話'.length);
  });
});
