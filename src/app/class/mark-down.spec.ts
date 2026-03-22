import { TestBed } from '@angular/core/testing';
import { MarkDown } from './mark-down';
import { ObjectStore } from './core/synchronize-object/object-store';

describe('MarkDown', () => {
  let store: ObjectStore;
  let markDown: MarkDown;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();

    markDown = new MarkDown();
    markDown.initialize();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('markDownCheckBox()', () => {
    it('未チェックのチェックボックスをHTMLに変換する', () => {
      const result = markDown.markDownCheckBox('[]項目1', 'base');
      expect(result).toContain('<input');
      expect(result).toContain('type="checkbox"');
      expect(result).not.toContain('checked');
    });

    it('チェック済みのチェックボックスをHTMLに変換する', () => {
      const result = markDown.markDownCheckBox('[x]項目1', 'base');
      expect(result).toContain('checked="checked"');
    });

    it('全角チェックボックスも変換する', () => {
      const result = markDown.markDownCheckBox('［x］項目1', 'base');
      expect(result).toContain('checked="checked"');
    });

    it('大文字Xのチェックボックスも変換する', () => {
      const result = markDown.markDownCheckBox('[X]項目1', 'base');
      expect(result).toContain('checked="checked"');
    });

    it('baseIdを含むidが振られる', () => {
      const result = markDown.markDownCheckBox('[]項目', 'test-id');
      expect(result).toContain('id="test-id_mark_00000000"');
    });

    it('複数のチェックボックスに連番IDが振られる', () => {
      const result = markDown.markDownCheckBox('[]項目1[]項目2', 'base');
      expect(result).toContain('id="base_mark_00000000"');
      expect(result).toContain('id="base_mark_00000001"');
    });

    it('HTMLエスケープが適用される', () => {
      const result = markDown.markDownCheckBox('<script>alert(1)</script>', 'base');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });
  });

  describe('markDownTable()', () => {
    it('パイプ区切りのテーブルをHTML要素に変換する', () => {
      const input = '|列1|列2|\n|データ1|データ2|';
      const result = markDown.markDownTable(input);
      expect(result).toContain('markdown_table');
      expect(result).toContain('display: table');
      expect(result).toContain('列1');
      expect(result).toContain('列2');
    });

    it('テーブルでない行はそのまま出力する', () => {
      const result = markDown.markDownTable('通常のテキスト');
      expect(result).toContain('通常のテキスト');
      expect(result).not.toContain('markdown_table');
    });

    it('テーブルの後に通常テキストが続く場合閉じタグを出力する', () => {
      const input = '|列1|列2|\n通常テキスト';
      const result = markDown.markDownTable(input);
      expect(result).toContain('</div>');
      expect(result).toContain('通常テキスト');
    });

    it('全角パイプも区切りとして認識する', () => {
      const input = '｜列1｜列2｜';
      const result = markDown.markDownTable(input);
      expect(result).toContain('markdown_table');
    });
  });

  describe('changeMarkDownCheckBox()', () => {
    it('不正なIDの場合何もしない', () => {
      markDown.changeMarkDownCheckBox('invalid', 1);
      // エラーが発生しないことを確認
    });

    it('存在しないオブジェクトの場合何もしない', () => {
      markDown.changeMarkDownCheckBox('nonexistent_mark_00000000', 1);
      // エラーが発生しないことを確認
    });

    it('同じタイムスタンプでの連続呼び出しは無視する', () => {
      markDown.changeMarkDownCheckBox('any_mark_00000000', 100);
      markDown.changeMarkDownCheckBox('any_mark_00000000', 100);
      // 2回目は何もしない（タイムスタンプが同じなので）
    });
  });
});
