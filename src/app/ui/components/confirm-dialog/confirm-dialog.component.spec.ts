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

  it('メッセージを表示する', async () => {
    await setup({ message: 'テストメッセージ' });

    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.textContent).toContain('テストメッセージ');
  });

  it('OK ボタンで true を解決する', async () => {
    await setup({ message: '確認' });

    component.ok();

    expect(modalService.resolve).toHaveBeenCalledWith(true);
  });

  it('キャンセルボタンで false を解決する', async () => {
    await setup({ message: '確認' });

    component.cancel();

    expect(modalService.resolve).toHaveBeenCalledWith(false);
  });

  it('danger=true のとき danger クラスの OK ボタンを表示する', async () => {
    await setup({ message: '削除確認', danger: true });

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const okBtn = Array.from(buttons).find((b) => b.classList.contains('text-ui-danger'));
    expect(okBtn).toBeTruthy();
  });

  it('danger=false のとき accent クラスの OK ボタンを表示する', async () => {
    await setup({ message: '確認', danger: false });

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const okBtn = Array.from(buttons).find((b) => b.classList.contains('bg-ui-accent'));
    expect(okBtn).toBeTruthy();
  });
});
