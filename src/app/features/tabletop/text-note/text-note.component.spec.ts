import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
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
});
