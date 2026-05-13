import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@axe/composition/app-config.service';
import { AppInitializationService } from '@axe/composition/app-initialization.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Alarm } from '@axe/domain/alarm/alarm';
import { DiceBot } from '@axe/domain/dice/dice-bot';
import { Jukebox } from '@axe/domain/media/jukebox';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { Vote } from '@axe/domain/vote/vote';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('AppInitializationService', () => {
  let service: AppInitializationService;
  let objectStore: ObjectStore;

  beforeEach(() => {
    PeerCursor.myCursor = null!;
    TestBed.configureTestingModule({
      providers: [...TEST_PROVIDERS],
    });
    objectStore = TestBed.inject(ObjectStore);
    vi.spyOn(TestBed.inject(AppConfigService), 'initialize').mockImplementation(() => {});
    service = TestBed.inject(AppInitializationService);
  });

  afterEach(() => {
    PeerCursor.myCursor = null!;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialize()', () => {
    beforeEach(() => {
      service.initialize();
    });

    it('ドメインオブジェクトが ObjectStore に登録されること', () => {
      expect(objectStore.get<DiceBot>('DiceBot')).toBeTruthy();
      expect(objectStore.get<Jukebox>('Jukebox')).toBeTruthy();
      expect(objectStore.get<Vote>('Vote')).toBeTruthy();
      expect(objectStore.get<Alarm>('Alarm')).toBeTruthy();
      expect(objectStore.get<ReloadCheck>('ReloadCheck')).toBeTruthy();
      expect(objectStore.get<SoundEffect>('SoundEffect')).toBeTruthy();
    });

    it('オーディオプリセットが設定されること', () => {
      expect(PresetSound.dicePick).toBeTruthy();
      expect(PresetSound.dicePut).toBeTruthy();
      expect(PresetSound.diceRoll1).toBeTruthy();
      expect(PresetSound.diceRoll2).toBeTruthy();
      expect(PresetSound.cardDraw).toBeTruthy();
      expect(PresetSound.alarm).toBeTruthy();
    });

    it('PeerCursor.myCursor が作成されること', () => {
      expect(PeerCursor.myCursor).toBeTruthy();
      expect(PeerCursor.myCursor.name).toBe('プレイヤー');
    });
  });
});
