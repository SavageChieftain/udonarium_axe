import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appAutoFocus]' })
export class AutoFocusDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const element = this.elementRef.nativeElement;
      element.focus();
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) element.select();
    });
  }
}
