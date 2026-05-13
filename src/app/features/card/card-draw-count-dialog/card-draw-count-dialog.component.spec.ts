import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { CardDrawCountDialogComponent } from '@axe/features/card/card-draw-count-dialog/card-draw-count-dialog.component';

describe('CardDrawCountDialogComponent', () => {
  let fixture: ComponentFixture<CardDrawCountDialogComponent>;
  let component: CardDrawCountDialogComponent;
  let modalService: { option: unknown; resolve: ReturnType<typeof vi.fn> };

  async function setup(option: unknown) {
    modalService = { option, resolve: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CardDrawCountDialogComponent],
    });
    TestBed.overrideProvider(ModalService, { useValue: modalService });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(CardDrawCountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('初期値を2枚と上限枚数の小さい方にすること', async () => {
    await setup({ maxCount: 5 });

    expect(component.count).toBe(2);
  });

  it('上限が1枚のときは初期値を1枚にすること', async () => {
    await setup({ maxCount: 1 });

    expect(component.count).toBe(1);
  });

  it('確定時は1から上限までに丸めた枚数を返すこと', async () => {
    await setup({ maxCount: 3 });
    component.count = 9;

    component.confirm();

    expect(modalService.resolve).toHaveBeenCalledWith(3);
  });

  it('キャンセル時はnullを返すこと', async () => {
    await setup({ maxCount: 3 });

    component.cancel();

    expect(modalService.resolve).toHaveBeenCalledWith(null);
  });
});
