import { downloadBlob } from '@axe/core/util/download-blob';

describe('downloadBlob', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:stub://1');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('<a download> をクリックしてオブジェクト URL を解放する', () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const createSpy = vi.spyOn(document, 'createElement');

    downloadBlob(blob, 'hello.txt');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:stub://1');

    const anchor = createSpy.mock.results[0].value as HTMLAnchorElement;
    expect(anchor.tagName).toBe('A');
    expect(anchor.href).toContain('blob:stub://1');
    expect(anchor.download).toBe('hello.txt');
  });
});
