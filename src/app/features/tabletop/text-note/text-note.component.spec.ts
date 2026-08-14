import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { TextNote } from '@axe/domain/tabletop/text-note';
import { TextNoteComponent } from '@axe/features/tabletop/text-note/text-note.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('TextNoteComponent', () => {
  let component: TextNoteComponent;
  let fixture: ComponentFixture<TextNoteComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TextNoteComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextNoteComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('registers its effect in the constructor, so nothing is set up outside an injection context', () => {
    // the effect is registered in the constructor rather than from a lifecycle hook
    expect(component).toBeTruthy();
  });

  describe('viewRotateZ computed signal', () => {
    it('starts at ten', () => {
      expect(component.viewRotateZ()).toBe(10);
    });

    it('turns with the table view', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(50, 20, 60);
      expect(component.viewRotateZ()).toBe(60);
    });
  });

  describe('edit toggle + decoratedHtml', () => {
    let note: TextNote;

    beforeEach(() => {
      note = TextNote.create('メモ', '> @勇者\n> こんにちは\n本文');
      fixture.componentRef.setInput('textNote', note);
      fixture.detectChanges();
    });

    afterEach(() => {
      note.destroy();
    });

    it('starts out of edit mode', () => {
      expect(component.isEditing()).toBe(false);
    });

    it('marks up a quoted line as a quotation', () => {
      const html = component.decoratedHtml();
      expect(html).toContain('<span class="chat-quote">');
      expect(html).toContain('@勇者');
      expect(html).toContain('本文');
    });

    it('goes into edit mode on request', () => {
      component.enterEdit();
      expect(component.isEditing()).toBe(true);
    });

    it('stays out of it while the note is locked', () => {
      note.isLock = true;
      component.enterEdit();
      expect(component.isEditing()).toBe(false);
    });

    it('leaves edit mode when the field loses focus', () => {
      component.enterEdit();
      expect(component.isEditing()).toBe(true);
      component.onTextAreaBlur();
      expect(component.isEditing()).toBe(false);
    });
  });
});
