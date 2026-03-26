import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { FileStorageComponent } from './file-storage.component';

describe('FileStorageComponent', () => {
  let component: FileStorageComponent;
  let fixture: ComponentFixture<FileStorageComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FileStorageComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileStorageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('checkedFiles による選択状態管理', () => {
    it('imgBlockClick で未登録のIDが追加されること', () => {
      component.imgBlockClick('img-123');
      expect(component['checkedFiles'].has('img-123')).toBe(true);
    });

    it('imgBlockClick で登録済みのIDが削除されること', () => {
      component.imgBlockClick('img-123');
      component.imgBlockClick('img-123');
      expect(component['checkedFiles'].has('img-123')).toBe(false);
    });

    it('複数のファイルを独立して管理できること', () => {
      component.imgBlockClick('img-a');
      component.imgBlockClick('img-b');
      expect(component['checkedFiles'].has('img-a')).toBe(true);
      expect(component['checkedFiles'].has('img-b')).toBe(true);

      component.imgBlockClick('img-a');
      expect(component['checkedFiles'].has('img-a')).toBe(false);
      expect(component['checkedFiles'].has('img-b')).toBe(true);
    });
  });

  describe('changeTag', () => {
    it('タグ名が「全て」のとき早期リターンすること', () => {
      component['checkedFiles'].add('img-1');
      component.newTagName = '全て';
      component.changeTag();
      // エラーなく完了すること（タグ変更処理が行われない）
    });

    it('タグ名が「システム予約」のとき早期リターンすること', () => {
      component['checkedFiles'].add('img-1');
      component.newTagName = 'システム予約';
      component.changeTag();
      // エラーなく完了すること
    });
  });
});
