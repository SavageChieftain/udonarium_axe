import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { GameCharacter } from '@axe/domain/character/game-character';
import { GameCharacterComponent } from '@axe/features/character/game-character/game-character.component';
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

  it('コマ高さ指定フラグがcomputed signalで更新されること', async () => {
    const char = GameCharacter.create('height-flag-test', 1, '');
    fixture.componentRef.setInput('gameCharacter', char);

    try {
      expect(component.specifyKomaImageFlag()).toBe(false);

      char.specifyKomaImageFlag = true;
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      expect(component.specifyKomaImageFlag()).toBe(true);
    } finally {
      char.destroy();
    }
  });

  it('高さ指定モードの画像も名前とバフの配置基準になるようレイアウトに参加すること', () => {
    ImageStorage.instance.add('piece-height-url');
    const char = GameCharacter.create('height-layout-test', 1, 'piece-height-url');
    char.specifyKomaImageFlag = true;
    char.komaImageHeight = 240;
    fixture.componentRef.setInput('gameCharacter', char);

    try {
      fixture.detectChanges();

      const pieceImage = fixture.nativeElement.querySelector('img.image.chrome-smooth-image-trick') as HTMLImageElement;
      expect(pieceImage).toBeTruthy();
      expect(pieceImage.style.position).toBe('');
      expect(pieceImage.style.display).toBe('inline-block');
      expect(pieceImage.style.height).toBe('240px');
    } finally {
      char.destroy();
      ImageStorage.instance.delete('piece-height-url');
    }
  });

  describe('ALTクリックのターゲット切り替え', () => {
    it('ALT付きpointerdownで対象キャラのtargetedを切り替えて表示更新通知を出すこと', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      const notifySpy = vi.spyOn(uiSignalService, 'notifyTargetChange');
      const char = GameCharacter.create('target-test', 1, '');
      fixture.componentRef.setInput('gameCharacter', char);

      try {
        const event = new PointerEvent('pointerdown', { altKey: true, button: 0, cancelable: true });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
        const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

        component.checkKey(event);

        expect(char.targeted).toBe(true);
        expect(notifySpy).toHaveBeenCalledWith(char.identifier, char.aliasName);
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(stopPropagationSpy).toHaveBeenCalled();
      } finally {
        char.destroy();
      }
    });

    it('Shift+ALT付きpointerdownでは全ターゲットを解除して現在キャラを再選択しないこと', () => {
      const uiSignalService = TestBed.inject(UiSignalService);
      const notifySpy = vi.spyOn(uiSignalService, 'notifyTargetChange');
      const char1 = GameCharacter.create('target-clear-1', 1, '');
      const char2 = GameCharacter.create('target-clear-2', 1, '');
      char1.targeted = true;
      char2.targeted = true;
      fixture.componentRef.setInput('gameCharacter', char1);

      try {
        component.checkKey(
          new PointerEvent('pointerdown', { altKey: true, shiftKey: true, button: 0, cancelable: true })
        );

        expect(char1.targeted).toBe(false);
        expect(char2.targeted).toBe(false);
        expect(notifySpy).toHaveBeenCalledWith(char1.identifier, char1.aliasName);
        expect(notifySpy).toHaveBeenCalledWith(char2.identifier, char2.aliasName);
      } finally {
        char1.destroy();
        char2.destroy();
      }
    });
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
        component.setAltitude(5);
      }).not.toThrow();
    });

    it('コンポーネントの初期化と破棄で例外が発生しないこと', () => {
      expect(() => fixture.detectChanges()).not.toThrow();
      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
