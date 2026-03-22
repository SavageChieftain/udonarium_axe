import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/core/system';

import { FileArchiver } from './file-archiver';

describe('FileArchiver', () => {
  beforeEach(() => {
    vi.spyOn(EventSystem, 'trigger');
    vi.spyOn(EventSystem, 'register').mockReturnValue({ on: vi.fn().mockReturnThis() } as unknown as ReturnType<
      typeof EventSystem.register
    >);
    vi.spyOn(EventSystem, 'unregister');
    vi.spyOn(ObjectStore.instance, 'get').mockReturnValue({
      isLoadOk: () => true,
      reloadCheckStart: vi.fn(),
    } as unknown as ReturnType<typeof ObjectStore.instance.get>);
    Object.defineProperty(Network, 'peerContext', {
      get: () => ({ roomName: '' }),
      configurable: true,
    });
  });

  afterEach(() => {
    (FileArchiver as unknown as { _instance: FileArchiver | undefined })._instance = undefined;
    vi.restoreAllMocks();
  });

  describe('instance', () => {
    it('シングルトンインスタンスを返す', () => {
      const a = FileArchiver.instance;
      const b = FileArchiver.instance;
      expect(a).toBe(b);
    });
  });

  describe('initialize', () => {
    it('initializeを呼んでもエラーにならない', () => {
      FileArchiver.instance.initialize();
      expect(true).toBe(true);
    });
  });

  describe('load', () => {
    it('空ファイルリストでもエラーにならない', async () => {
      await FileArchiver.instance.load([]);
    });
  });
});
