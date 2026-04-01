import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TextNote } from '@axe/domain/shared/text-note';

describe('TextNote', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('タイトルとテキストを指定して作成する', () => {
      const note = TextNote.create('メモ', 'テスト内容');
      expect(note).toBeTruthy();
      expect(note.title).toBe('メモ');
      expect(note.text).toBe('テスト内容');
    });

    it('デフォルトのフォントサイズ16', () => {
      const note = TextNote.create('t', 'text');
      expect(note.fontSize).toBe(16);
    });

    it('フォントサイズを指定できる', () => {
      const note = TextNote.create('t', 'text', 24);
      expect(note.fontSize).toBe(24);
    });

    it('カスタムサイズを指定できる', () => {
      const note = TextNote.create('t', 'text', 16, 3, 4);
      expect(note.width).toBe(3);
      expect(note.height).toBe(4);
    });

    it('カスタムidentifierで作成する', () => {
      const note = TextNote.create('t', 'text', 16, 1, 1, 'note-id');
      expect(note.identifier).toBe('note-id');
    });

    it('ObjectStoreに追加される', () => {
      const note = TextNote.create('t', 'text');
      expect(store.get(note.identifier)).toBe(note);
    });

    it('デフォルトのwidth/heightが1', () => {
      const note = TextNote.create('t', 'text');
      expect(note.width).toBe(1);
      expect(note.height).toBe(1);
    });
  });

  describe('aliasName', () => {
    it('"text-note"を返す', () => {
      const note = TextNote.create('t', 'text');
      expect(note.aliasName).toBe('text-note');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('isLock がデフォルト false', () => {
      const note = TextNote.create('t', 'text');
      expect(note.isLock).toBe(false);
    });

    it('rotate がデフォルト 0', () => {
      const note = TextNote.create('t', 'text');
      expect(note.rotate).toBe(0);
    });

    it('zindex がデフォルト 0', () => {
      const note = TextNote.create('t', 'text');
      expect(note.zindex).toBe(0);
    });

    it('password がデフォルト空文字', () => {
      const note = TextNote.create('t', 'text');
      expect(note.password).toBe('');
    });

    it('isUpright がデフォルト true', () => {
      const note = TextNote.create('t', 'text');
      expect(note.isUpright).toBe(true);
    });

    it('limitHeight がデフォルト false', () => {
      const note = TextNote.create('t', 'text');
      expect(note.limitHeight).toBe(false);
    });
  });

  describe('text setter', () => {
    it('テキストを変更できる', () => {
      const note = TextNote.create('t', '初期テキスト');
      note.text = '変更後テキスト';
      expect(note.text).toBe('変更後テキスト');
    });
  });

  describe('TabletopObject 継承', () => {
    it('locationのデフォルトがtable', () => {
      const note = TextNote.create('t', 'text');
      expect(note.location.name).toBe('table');
    });
  });
});
