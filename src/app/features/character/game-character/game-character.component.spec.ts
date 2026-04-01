import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameCharacterComponent } from '@axe/features/character/game-character/game-character.component';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('GameCharacterComponent', () => {
  let component: GameCharacterComponent;
  let fixture: ComponentFixture<GameCharacterComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GameCharacterComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameCharacterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInitでNG0203が発生しないこと（effectがコンストラクタで呼ばれている）', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  describe('viewRotateZ computed signal', () => {
    it('初期値はデフォルト10であること', () => {
      expect(component.viewRotateZ()).toBe(10);
    });

    it('UiSignalServiceのtableViewRotationに連動してZ回転値が変わること', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      uiSignalService.notifyTableViewRotation(50, 20, 120);
      expect(component.viewRotateZ()).toBe(120);
    });
  });

  it('ChangeDetectorRefを使用していないこと', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).changeDetector).toBeUndefined();
  });

  it('isTargetedがcomputed signalであること', () => {
    expect(typeof component.isTargeted).toBe('function');
  });

  describe('初期化と破棄', () => {
    it('gameCharacterが設定されていなくてもgetterが例外を投げないこと', () => {
      expect(() => {
        const name = component.name;
        expect(name).toBeDefined();
      }).not.toThrow();
    });

    it('gameCharacterが設定されていなくてもisLockの取得が例外を投げないこと', () => {
      expect(() => {
        const isLock = component.isLock;
        expect(isLock).toBeDefined();
      }).not.toThrow();
    });

    it('gameCharacterが設定されていなくてもisLockの設定が例外を投げないこと', () => {
      expect(() => {
        component.isLock = true;
      }).not.toThrow();
    });

    it('gameCharacterが設定されていなくてもsizeが例外を投げないこと', () => {
      expect(() => {
        const size = component.size;
        expect(size).toBeDefined();
      }).not.toThrow();
    });

    it('gameCharacterが設定されていなくてもaltitudeの取得が例外を投げないこと', () => {
      expect(() => {
        const altitude = component.altitude;
        expect(altitude).toBeDefined();
      }).not.toThrow();
    });

    it('gameCharacterが設定されていなくてもaltitudeの設定が例外を投げないこと', () => {
      expect(() => {
        component.altitude = 5;
      }).not.toThrow();
    });

    it('ngAfterViewInitで例外が発生しないこと', () => {
      expect(() => {
        component.ngAfterViewInit();
      }).not.toThrow();
    });

    it('ngOnDestroyでタイマーをクリアしても例外が発生しないこと', () => {
      expect(() => {
        component.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
