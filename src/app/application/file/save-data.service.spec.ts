import { inject, TestBed } from '@angular/core/testing';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageFile, ImageState } from '@axe/core/storage/image-file';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('SaveDataService', () => {
  type SaveDataServicePrivateApi = {
    _saveRoomAsync: (fileName?: string) => Promise<void>;
    _saveGameObjectAsync: (gameObject: object, fileName?: string) => Promise<void>;
    createChatLogImageSrc: (image: ImageFile, maxDimension: number) => Promise<string>;
    convertToXml: (gameObject: unknown) => string;
    searchImageFiles: (xml: string) => ImageFile[];
    saveAsync: (files: File[], zipName: string, updateCallback?: (percent: number) => void) => Promise<void>;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS, SaveDataService],
    });
  });

  it('should be created', inject([SaveDataService], (service: SaveDataService) => {
    expect(service).toBeTruthy();
  }));

  it('saveRoomAsync: blob が null の COMPLETE 画像があっても保存処理が落ちない', async () => {
    const service = TestBed.inject(SaveDataService);
    const privateApi = service as unknown as SaveDataServicePrivateApi;

    const imageWithNullBlob = {
      identifier: 'image-null-blob',
      state: ImageState.COMPLETE,
      blob: null,
    } as ImageFile;

    vi.spyOn(privateApi, 'convertToXml').mockReturnValue('<node />');
    vi.spyOn(privateApi, 'searchImageFiles').mockReturnValue([imageWithNullBlob]);
    const saveAsyncSpy = vi.spyOn(privateApi, 'saveAsync').mockResolvedValue(undefined);

    await expect(privateApi._saveRoomAsync('room')).resolves.toBeUndefined();

    const files = saveAsyncSpy.mock.calls[0][0] as File[];
    expect(files.some((file: File) => file.name.startsWith('image-null-blob.'))).toBe(false);
  });

  it('saveGameObjectAsync: blob が null の COMPLETE 画像があっても保存処理が落ちない', async () => {
    const service = TestBed.inject(SaveDataService);
    const privateApi = service as unknown as SaveDataServicePrivateApi;

    const imageWithNullBlob = {
      identifier: 'image-null-blob',
      state: ImageState.COMPLETE,
      blob: null,
    } as ImageFile;

    vi.spyOn(privateApi, 'convertToXml').mockReturnValue('<node />');
    vi.spyOn(privateApi, 'searchImageFiles').mockReturnValue([imageWithNullBlob]);
    const saveAsyncSpy = vi.spyOn(privateApi, 'saveAsync').mockResolvedValue(undefined);

    await expect(privateApi._saveGameObjectAsync({}, 'obj')).resolves.toBeUndefined();

    const files = saveAsyncSpy.mock.calls[0][0] as File[];
    expect(files.some((file: File) => file.name.startsWith('image-null-blob.'))).toBe(false);
  });

  it('HTMLログ添付画像src: blob画像をdata URLに変換する', async () => {
    const service = TestBed.inject(SaveDataService);
    const privateApi = service as unknown as SaveDataServicePrivateApi;
    const image = {
      blob: new Blob(['Test'], { type: 'text/plain' }),
      url: 'blob:stamp-image',
    } as ImageFile;

    await expect(privateApi.createChatLogImageSrc(image, 0)).resolves.toBe('data:text/plain;base64,VGVzdA==');
  });

  it('HTMLログ添付画像src: 取得可能なURL画像をdata URLに変換する', async () => {
    const service = TestBed.inject(SaveDataService);
    const privateApi = service as unknown as SaveDataServicePrivateApi;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['UrlImage'], { type: 'text/plain' })),
    });
    vi.stubGlobal('fetch', fetchMock);
    const image = {
      blob: null,
      url: 'https://example.test/stamp.txt',
    } as ImageFile;

    try {
      await expect(privateApi.createChatLogImageSrc(image, 0)).resolves.toBe('data:text/plain;base64,VXJsSW1hZ2U=');
      expect(fetchMock).toHaveBeenCalledWith('https://example.test/stamp.txt');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('HTMLログ添付画像src: URL画像を取得できない場合は元URLを返す', async () => {
    const service = TestBed.inject(SaveDataService);
    const privateApi = service as unknown as SaveDataServicePrivateApi;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const image = {
      blob: null,
      url: 'https://example.test/stamp.png',
    } as ImageFile;

    try {
      await expect(privateApi.createChatLogImageSrc(image, 0)).resolves.toBe('https://example.test/stamp.png');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  describe('チャットログ HTML の画像レジストリ', () => {
    type RegistryApi = {
      buildChatLogImageRegistry: (chatTabs: readonly unknown[]) => Promise<{
        resolver: (image: ImageFile) => string;
        registryScript: string;
      }>;
    };

    function makeTab(messages: { image?: ImageFile | null; attachmentImages?: ImageFile[] }[]): unknown {
      return {
        chatMessages: messages.map((m) => ({
          image: m.image ?? null,
          attachmentImages: m.attachmentImages ?? [],
        })),
      };
    }

    it('同一画像が複数メッセージで使われても data URL はレジストリに 1 回しか入らない', async () => {
      const service = TestBed.inject(SaveDataService);
      const api = service as unknown as RegistryApi;
      const portrait = {
        identifier: 'portrait-1',
        blob: new Blob(['BIN'], { type: 'text/plain' }),
      } as unknown as ImageFile;
      const tab = makeTab([{ image: portrait }, { image: portrait }, { image: portrait }]);

      const { resolver, registryScript } = await api.buildChatLogImageRegistry([tab]);

      const key = resolver(portrait);
      expect(key).toMatch(/^i\d+$/);
      // 同じ identifier なら毎回同じ key を返す (dedup)
      expect(resolver(portrait)).toBe(key);
      // レジストリスクリプトに data URL が 1 回だけ入っている
      const occurrences = (registryScript.match(/data:text\/plain;base64,QklO/g) ?? []).length;
      expect(occurrences).toBe(1);
    });

    it('レジストリスクリプトは <img data-img-key="..."> の src を埋めるハイドレーションを含む', async () => {
      const service = TestBed.inject(SaveDataService);
      const api = service as unknown as RegistryApi;
      const portrait = {
        identifier: 'p-1',
        blob: new Blob(['X'], { type: 'text/plain' }),
      } as unknown as ImageFile;
      const tab = makeTab([{ image: portrait }]);

      const { registryScript } = await api.buildChatLogImageRegistry([tab]);

      expect(registryScript).toContain("querySelectorAll('img[data-img-key]')");
      expect(registryScript).toContain("setAttribute('src'");
    });

    it('画像が無いタブだとスクリプトは空文字 (余計な <script> を吐かない)', async () => {
      const service = TestBed.inject(SaveDataService);
      const api = service as unknown as RegistryApi;
      const tab = makeTab([{}, {}]);

      const { registryScript } = await api.buildChatLogImageRegistry([tab]);
      expect(registryScript).toBe('');
    });
  });

  describe('saveAsync → FileArchiver.saveAsync の委譲', () => {
    it('updateCallback が percent=100 で呼ばれる', async () => {
      const service = TestBed.inject(SaveDataService);
      const privateApi = service as unknown as SaveDataServicePrivateApi;

      const fileArchiver = TestBed.inject(FileArchiver);
      vi.spyOn(fileArchiver, 'saveAsync').mockImplementation(async (_files, _zipName, cb) => {
        cb?.({ percent: 0, currentFile: '' });
        cb?.({ percent: 100, currentFile: '' });
      });

      const callback = vi.fn();
      await privateApi.saveAsync([], 'test', callback);

      expect(callback).toHaveBeenCalledWith(0);
      expect(callback).toHaveBeenCalledWith(100);
    });

    it('同じpercentが連続しても callback は1回だけ呼ばれる', async () => {
      const service = TestBed.inject(SaveDataService);
      const privateApi = service as unknown as SaveDataServicePrivateApi;

      const fileArchiver = TestBed.inject(FileArchiver);
      vi.spyOn(fileArchiver, 'saveAsync').mockImplementation(async (_files, _zipName, cb) => {
        cb?.({ percent: 50, currentFile: '' });
        cb?.({ percent: 50, currentFile: '' }); // 重複
        cb?.({ percent: 100, currentFile: '' });
      });

      const callback = vi.fn();
      await privateApi.saveAsync([], 'test', callback);

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});
