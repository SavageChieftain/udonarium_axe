import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { GameDataElementComponent } from './game-data-element.component';

describe('GameDataElementComponent', () => {
  let component: GameDataElementComponent;
  let fixture: ComponentFixture<GameDataElementComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameDataElementComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameDataElementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('editCheckedIds による編集チェック状態管理', () => {
    it('changeChk で未登録のIDが追加されること', () => {
      component.changeChk('elem-1');
      expect(component.isEditMarkDown('elem-1')).toBe(true);
      expect(component.isEditUrl('elem-1')).toBe(true);
    });

    it('changeChk で登録済みのIDが削除されること', () => {
      component.changeChk('elem-1');
      component.changeChk('elem-1');
      expect(component.isEditMarkDown('elem-1')).toBe(false);
      expect(component.isEditUrl('elem-1')).toBe(false);
    });

    it('isEditMarkDown が未登録IDでfalseを返すこと', () => {
      expect(component.isEditMarkDown('unknown')).toBe(false);
    });

    it('isEditUrl が未登録IDでfalseを返すこと', () => {
      expect(component.isEditUrl('unknown')).toBe(false);
    });

    it('textFocus でIDが追加されること', () => {
      component.textFocus('elem-2');
      expect(component.isEditMarkDown('elem-2')).toBe(true);
    });

    it('textFocus で既に登録済みのIDが維持されること', () => {
      component.changeChk('elem-3');
      component.textFocus('elem-3');
      expect(component.isEditMarkDown('elem-3')).toBe(true);
    });

    it('複数のIDを独立して管理できること', () => {
      component.changeChk('elem-a');
      component.changeChk('elem-b');
      expect(component.isEditMarkDown('elem-a')).toBe(true);
      expect(component.isEditMarkDown('elem-b')).toBe(true);

      component.changeChk('elem-a');
      expect(component.isEditMarkDown('elem-a')).toBe(false);
      expect(component.isEditMarkDown('elem-b')).toBe(true);
    });
  });
});
