import { inject, TestBed } from '@angular/core/testing';
import { ImageFile, ImageState } from '@axe/core/storage/image-file';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { SaveDataService } from './save-data.service';

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
});
