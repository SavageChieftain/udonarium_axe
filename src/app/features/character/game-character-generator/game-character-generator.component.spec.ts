import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

import { GameCharacterGeneratorComponent } from './game-character-generator.component';

describe('GameCharacterGeneratorComponent', () => {
  let component: GameCharacterGeneratorComponent;
  let fixture: ComponentFixture<GameCharacterGeneratorComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameCharacterGeneratorComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameCharacterGeneratorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('OnPushコンポーネントでChangeDetectorRefが注入されていること', () => {
    const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);
    expect(cdr).toBeTruthy();
  });
});
