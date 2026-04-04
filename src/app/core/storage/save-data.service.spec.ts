import { inject, TestBed } from '@angular/core/testing';
import { FileArchiver } from '@axe/core/storage/file-archiver';
import { ImageFile, ImageState } from '@axe/core/storage/image-file';
import { SaveDataService } from '@axe/core/storage/save-data.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('SaveDataService', () => {
  type SaveDataServicePrivateApi = {
    _saveRoomAsync: (fileName?: string) => Promise<void>;
    _saveGameObjectAsync: (gameObject: object, fileName?: string) => Promise<void>;
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
