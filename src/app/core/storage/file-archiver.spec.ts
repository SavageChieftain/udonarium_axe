import { imageDropped$, type ImageDroppedEvent } from '@axe/core/event/domain-events';
import { Network } from '@axe/core/index';
import { FileArchiver, isXmlCandidateFile } from '@axe/core/storage/file-archiver';
import { ImageFile } from '@axe/core/storage/image-file';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { strToU8, zip } from 'fflate';

describe('isXmlCandidateFile', () => {
  function file(name: string, type: string): File {
    return new File(['<x />'], name, { type });
  }

  it('XML ファイルを受け入れる', () => {
    expect(isXmlCandidateFile(file('data.xml', 'text/xml'))).toBe(true);
    expect(isXmlCandidateFile(file('data.xml', 'text/plain'))).toBe(true);
  });

  it('拡張子が分からない text も受け入れる', () => {
    expect(isXmlCandidateFile(file('data', 'text/plain'))).toBe(true);
  });

  it('HTML は受け付けない', () => {
    expect(isXmlCandidateFile(file('page.html', 'text/html'))).toBe(false);
    expect(isXmlCandidateFile(file('page.html', 'text/plain'))).toBe(false);
    expect(isXmlCandidateFile(file('page.htm', 'text/plain'))).toBe(false);
  });

  it('XML ではない text は受け付けない', () => {
    expect(isXmlCandidateFile(file('config.yaml', 'text/plain'))).toBe(false);
    expect(isXmlCandidateFile(file('style.css', 'text/css'))).toBe(false);
  });

  it('text 以外は受け付けない', () => {
    expect(isXmlCandidateFile(file('piece.png', 'image/png'))).toBe(false);
    expect(isXmlCandidateFile(file('room.zip', 'application/zip'))).toBe(false);
  });
});

describe('FileArchiver', () => {
  beforeEach(() => {
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

    it('FileList を渡してもエラーにならない', async () => {
      const fileList = {
        length: 0,
        [Symbol.iterator]: function* () {},
      } as unknown as FileList;
      await FileArchiver.instance.load(fileList);
    });
  });

  describe('画像ドロップ', () => {
    function imageFile(name: string): File {
      return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
    }

    beforeEach(() => {
      vi.spyOn(ImageStorage.instance, 'addAsync').mockImplementation((file) =>
        Promise.resolve(ImageFile.createEmpty(`image-${(file as File).name}`))
      );
    });

    it('ドロップ位置があれば画像ごとに imageDropped を発火する', async () => {
      const dropped: ImageDroppedEvent[] = [];
      const off = imageDropped$.subscribe((event) => dropped.push(event));

      await FileArchiver.instance.load([imageFile('a.png')], { x: 10, y: 20 });
      off();

      expect(dropped).toHaveLength(1);
      expect(dropped[0]).toMatchObject({ fileName: 'a.png', dropPoint: { x: 10, y: 20 } });
    });

    it('複数枚をまとめて落とすと重ならないようずらす', async () => {
      const dropped: ImageDroppedEvent[] = [];
      const off = imageDropped$.subscribe((event) => dropped.push(event));

      await FileArchiver.instance.load([imageFile('a.png'), imageFile('b.png')], { x: 10, y: 20 });
      off();

      expect(dropped.map((event) => event.dropPoint)).toEqual([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ]);
    });

    it('ドロップ位置がなければ発火しない（パネルからの読み込み等）', async () => {
      const dropped: ImageDroppedEvent[] = [];
      const off = imageDropped$.subscribe((event) => dropped.push(event));

      await FileArchiver.instance.load([imageFile('a.png')]);
      off();

      expect(dropped).toHaveLength(0);
    });
  });

  describe('handleZip (ZIPファイル読み込み)', () => {
    it('ZIPファイルの中身が load() を通じて処理される', async () => {
      // fflate でテスト用 ZIP を生成
      const zipBuffer = await new Promise<Uint8Array>((resolve, reject) => {
        zip({ 'data.xml': strToU8('<test />') }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const zipFile = new File([zipBuffer.slice()], 'test.zip', { type: 'application/zip' });
      const loadSpy = vi.spyOn(FileArchiver.instance, 'load');

      await FileArchiver.instance.load([zipFile]);

      // load が再帰的に呼ばれる（ZIPの展開後にファイルが再 load される）
      expect(loadSpy).toHaveBeenCalledTimes(2);
      const innerCall = loadSpy.mock.calls[1][0] as File[];
      expect(innerCall[0].name).toBe('data.xml');
    });

    it('破損ZIPはエラーを投げずスキップする', async () => {
      const badFile = new File([new Uint8Array([0, 1, 2, 3])], 'broken.zip', { type: 'application/zip' });
      await expect(FileArchiver.instance.load([badFile])).resolves.toBeUndefined();
    });
  });

  describe('saveAsync (ZIP出力)', () => {
    it('ファイルをZIPにまとめてダウンロードリンクをクリックする', async () => {
      const clickSpy = vi.fn();
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      const origCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const el = origCreate('a') as HTMLAnchorElement;
          el.click = clickSpy;
          return el;
        }
        return origCreate(tag);
      });

      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
      await FileArchiver.instance.saveAsync([file], 'archive');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock');
    });

    it('updateCallback が percent=0 と percent=100 で呼ばれる', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
      vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
      const origCreate = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const el = origCreate('a') as HTMLAnchorElement;
          el.click = vi.fn();
          return el;
        }
        return origCreate(tag);
      });

      const callback = vi.fn();
      const file = new File(['data'], 'test.txt', { type: 'text/plain' });
      await FileArchiver.instance.saveAsync([file], 'out', callback);

      expect(callback).toHaveBeenCalledWith({ percent: 0, currentFile: '' });
      expect(callback).toHaveBeenCalledWith({ percent: 100, currentFile: '' });
    });

    it('空ファイルリストでも saveAsync がエラーにならない', async () => {
      await expect(FileArchiver.instance.saveAsync([], 'empty')).resolves.toBeUndefined();
    });
  });

  describe('onDrop', () => {
    it('dataTransfer がない drop イベントでも例外を投げない', () => {
      const event = {
        preventDefault: vi.fn(),
        dataTransfer: null,
      } as unknown as DragEvent;

      expect(() =>
        (FileArchiver.instance as unknown as { onDrop: (event: DragEvent) => void }).onDrop(event)
      ).not.toThrow();
    });
  });
});
