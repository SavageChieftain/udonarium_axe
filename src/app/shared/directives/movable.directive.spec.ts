import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { MovableDirective } from './movable.directive';

@Component({
  selector: 'test-host',
  template: `<div appMovable [movable.option]="movableOption"></div>`,
  imports: [MovableDirective],
})
class TestHostComponent {
  movableOption = {};
}

describe('MovableDirective', () => {
  it('should be defined', () => {
    expect(MovableDirective).toBeDefined();
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

    it('setPositionがnull tabletopObjectでエラーにならないこと', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      expect(() => directive['setPosition'](null as unknown as TabletopObject)).not.toThrow();
    });

    it('setPositionがlocationなしオブジェクトでエラーにならないこと', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      expect(() => directive['setPosition']({} as unknown as TabletopObject)).not.toThrow();
    });

    it('shouldTransitionがnull tabletopObjectでfalseを返すこと', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      expect(directive['shouldTransition'](null as unknown as TabletopObject)).toBe(false);
    });

    it('shouldTransitionがlocationなしオブジェクトでfalseを返すこと', () => {
      fixture.detectChanges();
      const directive = fixture.debugElement.children[0].injector.get(MovableDirective);
      expect(directive['shouldTransition']({} as unknown as TabletopObject)).toBe(false);
    });
  });
});
