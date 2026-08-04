import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementAttribute, DataElementType } from '@axe/domain/data/data-element';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
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

  const useFlatTable = () => {
    const table = TestBed.inject(TabletopService).currentTable;
    table.mode2d = false;
    table.imageBillboard = false;
  };

  beforeEach(useFlatTable);
  afterEach(useFlatTable);

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInitでNG0203が発生しないこと（effectがコンストラクタで呼ばれている）', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  describe('頭上の表示', () => {
    it('既定のキャラクターは HP と MP をバーで出すこと', () => {
      const character = GameCharacter.create('ゲージ', 1, '');
      fixture.componentRef.setInput('gameCharacter', character);

      try {
        expect(component.pieceGauges().map((gauge) => gauge.name)).toEqual(['HP', 'MP']);
        expect(component.pieceGauges()[0]).toMatchObject({ initial: 'H', ratio: 1 });
      } finally {
        character.destroy();
      }
    });

    it('バー表示を外したリソースはコマから消えること', () => {
      const character = GameCharacter.create('ゲージ', 1, '');
      fixture.componentRef.setInput('gameCharacter', character);
      const objectChange = TestBed.inject(ObjectChangeService);
      const hp = DataElement.findElementByReference(character.rootDataElement!, 'HP')!;

      try {
        expect(component.pieceGauges()).toHaveLength(2);

        hp.removeAttribute(DataElementAttribute.PIECE_GAUGE);
        objectChange.notifyChanged(hp.identifier);

        expect(component.pieceGauges().map((gauge) => gauge.name)).toEqual(['MP']);
      } finally {
        character.destroy();
      }
    });

    it('バフをアイコンと強度のバッジに畳むこと', () => {
      const character = GameCharacter.create('バフ', 1, '');
      character.addExtendData();
      fixture.componentRef.setInput('gameCharacter', character);
      const objectChange = TestBed.inject(ObjectChangeService);
      const buffRoot = character.buffDataElement!;
      const container = DataElement.create('バフ', '', {});
      buffRoot.appendChild(container);
      const buff = DataElement.create('毒', 3, {
        type: DataElementType.NUMBER_RESOURCE,
        currentValue: 'ダメージ2',
      });
      buff.setAttribute(DataElementAttribute.BUFF_ICON, '☠️');
      container.appendChild(buff);
      objectChange.notifyChanged(buffRoot.identifier);

      try {
        expect(component.buffBadges()).toEqual([
          expect.objectContaining({ icon: '☠️', name: '毒', strength: '2', rounds: 3 }),
        ]);
      } finally {
        character.destroy();
      }
    });
  });

  describe('リソースの増減演出', () => {
    it('現在値が減ったら赤い数字とダメージの閃光を出すこと', async () => {
      const character = GameCharacter.create('被弾', 1, '');
      fixture.componentRef.setInput('gameCharacter', character);
      const objectChange = TestBed.inject(ObjectChangeService);
      const hp = DataElement.findElementByReference(character.rootDataElement!, 'HP')!;

      try {
        fixture.detectChanges();
        expect(component.floatingChanges()).toEqual([]);

        hp.currentValue = 170;
        objectChange.notifyChanged(hp.identifier);
        await fixture.whenStable();

        expect(component.floatingChanges()).toEqual([
          expect.objectContaining({ kind: 'damage', label: '-30', name: 'HP' }),
        ]);
        expect(component.hitFlash()).toBe('damage');
      } finally {
        character.destroy();
      }
    });

    it('現在値が増えたら緑の数字と回復の閃光を出すこと', async () => {
      const character = GameCharacter.create('回復', 1, '');
      fixture.componentRef.setInput('gameCharacter', character);
      const objectChange = TestBed.inject(ObjectChangeService);
      const hp = DataElement.findElementByReference(character.rootDataElement!, 'HP')!;
      hp.currentValue = 100;

      try {
        fixture.detectChanges();
        objectChange.notifyChanged(hp.identifier);
        await fixture.whenStable();
        component.floatingChanges.set([]);

        hp.currentValue = 160;
        objectChange.notifyChanged(hp.identifier);
        await fixture.whenStable();

        expect(component.floatingChanges()).toEqual([
          expect.objectContaining({ kind: 'heal', label: '+60', name: 'HP' }),
        ]);
        expect(component.hitFlash()).toBe('heal');
      } finally {
        character.destroy();
      }
    });

    it('変化の大きさで鳴らす音を選ぶこと', async () => {
      const character = GameCharacter.create('鳴り分け', 1, '');
      fixture.componentRef.setInput('gameCharacter', character);
      const objectChange = TestBed.inject(ObjectChangeService);
      const hp = DataElement.findElementByReference(character.rootDataElement!, 'HP')!;
      const played: string[] = [];
      vi.spyOn(SoundEffect, 'playLocal').mockImplementation((arg) => {
        played.push(typeof arg === 'string' ? arg : arg.identifier);
      });

      try {
        fixture.detectChanges();

        hp.currentValue = 190;
        objectChange.notifyChanged(hp.identifier);
        await fixture.whenStable();

        hp.currentValue = 130;
        objectChange.notifyChanged(hp.identifier);
        await fixture.whenStable();

        hp.currentValue = 10;
        objectChange.notifyChanged(hp.identifier);
        await fixture.whenStable();

        expect(played).toEqual([PresetSound.damageSmall, PresetSound.damageMedium, PresetSound.damageLarge]);
      } finally {
        character.destroy();
      }
    });

    it('増えるほど悪いリソースでは増加をダメージとして扱うこと', async () => {
      const character = GameCharacter.create('狂気', 1, '');
      fixture.componentRef.setInput('gameCharacter', character);
      const objectChange = TestBed.inject(ObjectChangeService);
      const hp = DataElement.findElementByReference(character.rootDataElement!, 'HP')!;
      hp.setAttribute(DataElementAttribute.GAUGE_INVERTED, 'true');
      const played: string[] = [];
      vi.spyOn(SoundEffect, 'playLocal').mockImplementation((arg) => {
        played.push(typeof arg === 'string' ? arg : arg.identifier);
      });

      try {
        fixture.detectChanges();

        hp.currentValue = 260;
        objectChange.notifyChanged(hp.identifier);
        await fixture.whenStable();

        expect(component.floatingChanges()).toEqual([
          expect.objectContaining({ kind: 'damage', label: '+60', name: 'HP' }),
        ]);
        expect(component.hitFlash()).toBe('damage');
        expect(played).toEqual([PresetSound.damageLarge]);
      } finally {
        character.destroy();
      }
    });

    it('変化が無ければ何も出さないこと', async () => {
      const character = GameCharacter.create('無変化', 1, '');
      fixture.componentRef.setInput('gameCharacter', character);
      const objectChange = TestBed.inject(ObjectChangeService);

      try {
        fixture.detectChanges();
        objectChange.notifyChanged(character.identifier);
        await fixture.whenStable();

        expect(component.floatingChanges()).toEqual([]);
        expect(component.hitFlash()).toBeNull();
      } finally {
        character.destroy();
      }
    });
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

  describe('imageBillboardEnabled テーブル設定追従', () => {
    it('currentTable.imageBillboard の値を反映すること', async () => {
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.imageBillboard = false;
      expect(component.imageBillboardEnabled()).toBe(false);

      tabletopService.currentTable.imageBillboard = true;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(component.imageBillboardEnabled()).toBe(true);
    });

    it('billboardTransformImage は verticalOffset=0 の transform を返すこと', () => {
      TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 10);
      expect(component.billboardTransformImage()).toContain('translateZ(0.00px)');
    });

    it('mode2d=true なら imageBillboard=false でも true を返すこと', async () => {
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.imageBillboard = false;
      tabletopService.currentTable.mode2d = true;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(component.imageBillboardEnabled()).toBe(true);
    });
  });

  describe('nameLabelOrbit 2Dモード時のスクリーン上方追従', () => {
    it('3Dモードでは translateY(-distance3d) を返すこと', async () => {
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.mode2d = false;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(component.nameLabelOrbit()).toBe('translateY(-30px)');
    });

    it('2Dモードでヨー=0なら translateZ(-d) で画面上方向に配置されること', async () => {
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.mode2d = true;
      TestBed.inject(UiSignalService).notifyTableViewRotation(0, 0, 0);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const transform = component.nameLabelOrbit();
      const x = Number(transform.match(/translateX\((-?[\d.]+)px\)/)?.[1] ?? NaN);
      expect(x).toBeCloseTo(0, 5);
      expect(transform).toContain('translateZ(-60.00px)');
    });

    it('2Dモードでヨーが90度なら translateX(-d), translateZ(0) になること', async () => {
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.mode2d = true;
      TestBed.inject(UiSignalService).notifyTableViewRotation(0, 0, 90);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const transform = component.nameLabelOrbit();
      expect(transform).toContain('translateX(-60.00px)');
      const z = Number(transform.match(/translateZ\((-?[\d.]+)px\)/)?.[1] ?? NaN);
      expect(z).toBeCloseTo(0, 5);
    });

    it('2Dモードでは billboardTransform の compensateZ が 0 になること', async () => {
      const tabletopService = TestBed.inject(TabletopService);
      tabletopService.currentTable.mode2d = true;
      TestBed.inject(UiSignalService).notifyTableViewRotation(50, 0, 10);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(component.billboardTransform()).toContain('translateZ(0.00px)');
      expect(component.billboardTransformBuff()).toContain('translateZ(0.00px)');
    });
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
