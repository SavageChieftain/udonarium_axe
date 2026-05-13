import { inject, TestBed } from '@angular/core/testing';
import { SaveDataService } from '@axe/application/file/save-data.service';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageFile, ImageState } from '@axe/core/storage/image-file';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('SaveDataService', () => {
  type SaveDataServicePrivateApi = {
    _saveRoomAsync: (fileName?: string) => Promise<void>;
    _saveGameObjectAsync: (gameObject: object, fileName?: string) => Promise<void>;
    createChatLogAttachmentImageSrc: (image: ImageFile) => Promise<string>;
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

    await expect(privateApi.createChatLogAttachmentImageSrc(image)).resolves.toBe('data:text/plain;base64,VGVzdA==');
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
      await expect(privateApi.createChatLogAttachmentImageSrc(image)).resolves.toBe(
        'data:text/plain;base64,VXJsSW1hZ2U='
      );
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
      await expect(privateApi.createChatLogAttachmentImageSrc(image)).resolves.toBe('https://example.test/stamp.png');
    } finally {
      vi.unstubAllGlobals();
    }
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
