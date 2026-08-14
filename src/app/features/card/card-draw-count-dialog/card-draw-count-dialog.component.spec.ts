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

  it('starts at two cards, or at the limit if it is lower', async () => {
    await setup({ maxCount: 5 });

    expect(component.count).toBe(2);
  });

  it('starts at one when that is the limit', async () => {
    await setup({ maxCount: 1 });

    expect(component.count).toBe(1);
  });

  it('returns a count between one and the limit', async () => {
    await setup({ maxCount: 3 });
    component.count = 9;

    component.confirm();

    expect(modalService.resolve).toHaveBeenCalledWith(3);
  });

  it('returns nothing on cancel', async () => {
    await setup({ maxCount: 3 });

    component.cancel();

    expect(modalService.resolve).toHaveBeenCalledWith(null);
  });
});
