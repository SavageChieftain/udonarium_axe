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

  it('effectがコンストラクタで登録されるためNG0203が発生しないこと', () => {
    // lifecycle hook廃止: effect()はコンストラクタ内で登録済み
    expect(component).toBeTruthy();
  });

  describe('viewRotateZ computed signal', () => {
    it('初期値はデフォルト10であること', () => {
      expect(component.viewRotateZ()).toBe(10);
    });

    it('UiSignalServiceのtableViewRotationに連動してZ回転値が変わること', () => {
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

    it('初期状態は非編集 (isEditing=false)', () => {
      expect(component.isEditing()).toBe(false);
    });

    it('decoratedHtml が引用行を chat-quote にして返すこと', () => {
      const html = component.decoratedHtml();
      expect(html).toContain('<span class="chat-quote">');
      expect(html).toContain('@勇者');
      expect(html).toContain('本文');
    });

    it('enterEdit() を呼ぶと isEditing=true になること', () => {
      component.enterEdit();
      expect(component.isEditing()).toBe(true);
    });

    it('isLock=true のときは enterEdit() しても編集モードに入らない', () => {
      note.isLock = true;
      component.enterEdit();
      expect(component.isEditing()).toBe(false);
    });

    it('onTextAreaBlur() で非編集モードに戻ること', () => {
      component.enterEdit();
      expect(component.isEditing()).toBe(true);
      component.onTextAreaBlur();
      expect(component.isEditing()).toBe(false);
    });
  });
});
