import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '@axe/application/ui/modal.service';
import { ConfirmDialogComponent } from '@axe/ui/components/confirm-dialog/confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;
  let modalService: { option: unknown; title: string; resolve: ReturnType<typeof vi.fn> };

  async function setup(option: unknown) {
    modalService = { option, title: '', resolve: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    });
    TestBed.overrideProvider(ModalService, { useValue: modalService });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows the message', async () => {
    await setup({ message: 'テストメッセージ' });

    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.textContent).toContain('テストメッセージ');
  });

  it('resolves true from the confirm button', async () => {
    await setup({ message: '確認' });

    component.ok();

    expect(modalService.resolve).toHaveBeenCalledWith(true);
  });

  it('resolves false from the cancel button', async () => {
    await setup({ message: '確認' });

    component.cancel();

    expect(modalService.resolve).toHaveBeenCalledWith(false);
  });

  it('styles the confirm button as dangerous when asked', async () => {
    await setup({ message: '削除確認', danger: true });

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const okBtn = Array.from(buttons).find((b) => b.classList.contains('text-ui-danger'));
    expect(okBtn).toBeTruthy();
  });

  it('styles the confirm button as an accent otherwise', async () => {
    await setup({ message: '確認', danger: false });

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const okBtn = Array.from(buttons).find((b) => b.classList.contains('bg-ui-accent'));
    expect(okBtn).toBeTruthy();
  });
});
