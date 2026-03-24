import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';

import { PresetSound, SoundEffect } from './sound-effect';

describe('PresetSound', () => {
  it('dicePick が空文字列で初期化される', () => {
    expect(PresetSound.dicePick).toBe('');
  });

  it('dicePut が空文字列で初期化される', () => {
    expect(PresetSound.dicePut).toBe('');
  });

  it('diceRoll1 が空文字列で初期化される', () => {
    expect(PresetSound.diceRoll1).toBe('');
  });

  it('diceRoll2 が空文字列で初期化される', () => {
    expect(PresetSound.diceRoll2).toBe('');
  });

  it('cardDraw が空文字列で初期化される', () => {
    expect(PresetSound.cardDraw).toBe('');
  });

  it('cardShuffle が空文字列で初期化される', () => {
    expect(PresetSound.cardShuffle).toBe('');
  });

  it('alarm が空文字列で初期化される', () => {
    expect(PresetSound.alarm).toBe('');
  });
});

describe('SoundEffect', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('インスタンス生成', () => {
    it('SoundEffectを作成できる', () => {
      const se = new SoundEffect();
      se.initialize();
      expect(se).toBeTruthy();
    });
  });

  describe('static play()', () => {
    it('文字列引数で呼び出せる', () => {
      // EventSystem.callを内部で呼ぶがエラーにはならない
      SoundEffect.play('test-identifier');
    });
  });

  describe('instance play()', () => {
    it('文字列引数で呼び出せる', () => {
      const se = new SoundEffect();
      se.initialize();
      se.play('test-identifier');
    });
  });
});
