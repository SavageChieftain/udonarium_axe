import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameTableScratchMaskComponent } from '@axe/features/tabletop/game-table-scratch-mask/game-table-scratch-mask.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameTableScratchMaskComponent', () => {
  let component: GameTableScratchMaskComponent;
  let fixture: ComponentFixture<GameTableScratchMaskComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameTableScratchMaskComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameTableScratchMaskComponent);
    component = fixture.componentInstance;
  });

  it('should be defined', () => {
    expect(component).toBeTruthy();
  });

  it('reads without throwing when there is no mask', () => {
    fixture.componentRef.setInput('gameTableScratchMask', null);
    expect(() => {
      const _name = component.name;
      const _width = component.width;
      const _height = component.height;
      const _isLock = component.isLock;
      const _color = component.color;
      const _isMine = component.isMine;
      const _posX = component.posX;
      const _posY = component.posY;
      const _posZ = component.posZ;
    }).not.toThrow();
  });
});
