import { TestBed } from '@angular/core/testing';
import { ConfirmService } from '@axe/application/ui/confirm.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

class Dialog {}

describe('ConfirmService', () => {
  let service: ConfirmService;
  let open: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    open = vi.fn();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(ModalService, { useValue: { open } });
    service = TestBed.inject(ConfirmService);
    ConfirmService.dialogComponentClass = Dialog;
  });

  afterEach(() => {
    ConfirmService.dialogComponentClass = null!;
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('opens the dialog with the option, or with a bare message wrapped', async () => {
    open.mockResolvedValue(true);
    await service.ask({ message: 'Delete?', danger: true });
    await service.ask('Sure?');
    expect(open.mock.calls[0]).toEqual([Dialog, { message: 'Delete?', danger: true }]);
    expect(open.mock.calls[1]).toEqual([Dialog, { message: 'Sure?' }]);
  });

  it('is yes only on a plain yes', async () => {
    open.mockResolvedValueOnce(true);
    await expect(service.ask('?')).resolves.toBe(true);
    open.mockResolvedValueOnce(null);
    await expect(service.ask('?')).resolves.toBe(false);
    open.mockRejectedValueOnce(new Error('closed'));
    await expect(service.ask('?')).resolves.toBe(false);
  });

  it('falls back to the browser when no dialog is registered', async () => {
    ConfirmService.dialogComponentClass = null!;
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    );
    await expect(service.ask('Native?')).resolves.toBe(true);
    expect(window.confirm).toHaveBeenCalledWith('Native?');
    expect(open).not.toHaveBeenCalled();
  });
});
