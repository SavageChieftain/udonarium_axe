import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortraitChoice, PortraitPickerComponent } from '@axe/ui/components/portrait-picker/portrait-picker.component';

const CHOICES: PortraitChoice[] = [
  { index: 0, name: '', url: 'blob:plain' },
  { index: 1, name: '笑顔', url: 'blob:smile' },
  { index: 2, name: '', url: '' },
];

describe('PortraitPickerComponent', () => {
  let component: PortraitPickerComponent;
  let fixture: ComponentFixture<PortraitPickerComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [PortraitPickerComponent] }).compileComponents();
    fixture = TestBed.createComponent(PortraitPickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('choices', CHOICES);
    fixture.detectChanges();
  });

  describe('the label on the strip', () => {
    it('answers to the name the picture was given', () => {
      fixture.componentRef.setInput('selectedIndex', 1);

      expect(component.label()).toBe('笑顔');
    });

    it('falls back to its place in the row', () => {
      fixture.componentRef.setInput('selectedIndex', 2);

      expect(component.label()).toBe('3/3');
    });
  });

  describe('the list it opens', () => {
    it('holds a row for every picture', () => {
      const rows = fixture.nativeElement.querySelectorAll('[role="option"]');

      expect(rows.length).toBe(3);
    });

    it('marks the chosen one', () => {
      fixture.componentRef.setInput('selectedIndex', 1);
      fixture.detectChanges();

      const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));

      expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    });

    it('gives a nameless picture a number to go by', () => {
      const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));

      expect(rows[0].textContent).toContain('立ち絵 1');
    });
  });

  describe('the list while it is shut', () => {
    it('leaves the hiding of it to the browser', () => {
      const popover: HTMLElement = fixture.nativeElement.querySelector('[popover]');

      expect((popover.getAttribute('class') ?? '').split(/\s+/)).not.toContain('flex');
      expect(popover.style.display).toBe('');
    });

    it('stands it up as a column only once it is open', () => {
      const popover: HTMLElement = fixture.nativeElement.querySelector('[popover]');
      popover.showPopover = () => undefined;
      popover.hidePopover = () => undefined;

      component.toggle();
      expect(popover.style.display).toBe('flex');

      component.close();
      expect(popover.style.display).toBe('');
    });
  });

  describe('choosing', () => {
    it('tells the parent which picture was chosen', () => {
      const picked: number[] = [];
      component.picked.subscribe((index) => picked.push(index));

      component.pick(2);

      expect(picked).toEqual([2]);
    });

    it('says nothing when the chosen one is already showing', () => {
      const picked: number[] = [];
      component.picked.subscribe((index) => picked.push(index));

      component.pick(0);

      expect(picked).toEqual([]);
    });

    it('steps along the row', () => {
      const picked: number[] = [];
      component.picked.subscribe((index) => picked.push(index));

      component.step(1);

      expect(picked).toEqual([1]);
    });

    it('stops at either end of the row', () => {
      const picked: number[] = [];
      component.picked.subscribe((index) => picked.push(index));

      component.step(-1);
      fixture.componentRef.setInput('selectedIndex', 2);
      component.step(1);

      expect(picked).toEqual([]);
    });
  });
});
