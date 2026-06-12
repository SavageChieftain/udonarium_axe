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

  describe('fitWidth オプション', () => {
    it('既定では固定幅クラスを持つこと', () => {
      fixture.detectChanges();
      const panel = fixture.nativeElement.querySelector('.animate-fly-in') as HTMLElement;
      expect(panel.classList.contains('w-200')).toBe(true);
      expect(panel.classList.contains('w-fit')).toBe(false);
    });

    it('option.fitWidth が true なら子コンポーネント駆動の幅になること', () => {
      vi.spyOn(component.modalService, 'option', 'get').mockReturnValue({ fitWidth: true });
      fixture.detectChanges();
      const panel = fixture.nativeElement.querySelector('.animate-fly-in') as HTMLElement;
      expect(panel.classList.contains('w-fit')).toBe(true);
      expect(panel.classList.contains('w-200')).toBe(false);
    });
  });
});
