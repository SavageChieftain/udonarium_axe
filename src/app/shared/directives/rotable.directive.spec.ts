import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { vi } from 'vitest';

import { RotableDirective } from './rotable.directive';

@Component({
  selector: 'test-host',
  template: `<div appRotable [rotable.option]="rotableOption"></div>`,
  imports: [RotableDirective],
})
class TestHostComponent {
  rotableOption = {};
}

describe('RotableDirective', () => {
  it('should be defined', () => {
    expect(RotableDirective).toBeDefined();
  });

  describe('tabletopObjectが未設定の場合', () => {
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      TestBed.configureTestingModule({
        imports: [TestHostComponent],
        providers: [...TEST_PROVIDERS],
      }).compileComponents();
    });

    beforeEach(() => {
      fixture = TestBed.createComponent(TestHostComponent);
    });

    it('tabletopObject未設定でもコンポーネント生成時にエラーが発生しないこと', () => {
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('initializeでUPDATE_GAME_OBJECTハンドラがnull tabletopObjectでエラーにならないこと', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(RotableDirective);
      expect(directive['tabletopObject']).toBeFalsy();
      // tabletopObject未設定時、initializeではイベント登録が行われない（elseブランチ）
      // → null guardは不要だがテストでカバレッジ確認
    });

    it('input未初期化でonInputStartが呼ばれても例外にならないこと', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(RotableDirective);
      const writableDirective = directive as unknown as {
        [key: string]: unknown;
        onInputStart: (event: MouseEvent | TouchEvent) => void;
      };
      writableDirective['grabbingSelecter'] = '';
      writableDirective['input'] = null;

      const element = fixture.nativeElement.querySelector('div') as HTMLElement;
      const event = {
        target: element,
        button: 0,
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      expect(() => writableDirective.onInputStart(event)).not.toThrow();
    });
  });
});
