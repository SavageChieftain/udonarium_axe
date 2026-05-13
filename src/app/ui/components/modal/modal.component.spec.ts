import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from '@axe/ui/components/modal/modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('title getter', () => {
    it('ModalServiceのtitleを取得すること', () => {
      component.modalService.title = 'テストタイトル';
      expect(component.title).toBe('テストタイトル');
    });
  });
});
