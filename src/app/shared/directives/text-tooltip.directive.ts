import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

@Directive({ selector: '[appTextTooltip]' })
export class TextTooltipDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly appTextTooltip = input<string>('');

  private tooltipEl: HTMLElement | null = null;

  private onMouseEnter = (e: MouseEvent) => this.show(e);
  private onMouseLeave = () => this.hide();
  private onMouseMove = (e: MouseEvent) => this.move(e);

  constructor() {
    afterNextRender(() => {
      const el = this.el.nativeElement;
      el.addEventListener('mouseenter', this.onMouseEnter);
      el.addEventListener('mouseleave', this.onMouseLeave);
      el.addEventListener('mousemove', this.onMouseMove);
    });
    this.destroyRef.onDestroy(() => {
      const el = this.el.nativeElement;
      el.removeEventListener('mouseenter', this.onMouseEnter);
      el.removeEventListener('mouseleave', this.onMouseLeave);
      el.removeEventListener('mousemove', this.onMouseMove);
      this.hide();
    });
  }

  private show(e: MouseEvent) {
    const text = this.appTextTooltip();
    if (!text) return;
    const host = this.el.nativeElement as HTMLElement;
    if (host.scrollWidth <= host.clientWidth && text === host.textContent?.trim()) return;
    this.hide();
    const div = document.createElement('div');
    div.className = 'app-text-tooltip';
    div.textContent = text;
    document.body.appendChild(div);
    this.tooltipEl = div;
    this.move(e);
  }

  private move(e: MouseEvent) {
    if (!this.tooltipEl) return;
    const x = e.clientX + 14;
    const y = e.clientY + 18;
    const rect = this.tooltipEl.getBoundingClientRect();
    this.tooltipEl.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
    this.tooltipEl.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
  }

  private hide() {
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }
}
