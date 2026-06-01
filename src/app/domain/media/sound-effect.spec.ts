import { TestBed } from '@angular/core/testing';
import { emitSendMessage } from '@axe/core/event/domain-events';
import { IPeerContext } from '@axe/core/network/peer-context';
import { resetPeerContextProvider, setPeerContextProvider } from '@axe/core/network/peer-context-source';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';

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
      // callSoundEffect()を内部で呼ぶがエラーにはならない
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

  describe('sendMessage$購読によるダイス音再生', () => {
    const selfUserId = 'self-user';

    beforeEach(() => {
      setPeerContextProvider({
        peerContext: { userId: selfUserId } as unknown as IPeerContext,
        peerContexts: [],
        peerIds: [],
        peerId: selfUserId,
      });
    });

    afterEach(() => {
      resetPeerContextProvider();
    });

    it('isDicebotがtrueのメッセージでSoundEffect.playが呼ばれる', async () => {
      const se = new SoundEffect('test-se');
      se.initialize();
      store.add(se);

      const playSpy = vi.spyOn(SoundEffect, 'play').mockImplementation(() => {});

      const msg = new ChatMessage();
      msg.setAttribute('tag', 'system');
      msg.setAttribute('from', 'System-BCDice');
      msg.setAttribute('originFrom', selfUserId);
      msg.initialize();
      store.add(msg);

      emitSendMessage({ messageIdentifier: msg.identifier, messageTarget: null });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(playSpy).toHaveBeenCalledTimes(1);
      const calledWith = playSpy.mock.calls[0][0] as unknown as string;
      expect(calledWith === PresetSound.diceRoll1 || calledWith === PresetSound.diceRoll2).toBe(true);

      playSpy.mockRestore();
    });

    it('isDicebotがfalseのメッセージではplayが呼ばれない', async () => {
      const se = new SoundEffect('test-se-2');
      se.initialize();
      store.add(se);

      const playSpy = vi.spyOn(SoundEffect, 'play').mockImplementation(() => {});

      const msg = new ChatMessage();
      msg.setAttribute('tag', '');
      msg.setAttribute('from', selfUserId);
      msg.initialize();
      store.add(msg);

      emitSendMessage({ messageIdentifier: msg.identifier, messageTarget: null });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(playSpy).not.toHaveBeenCalled();

      playSpy.mockRestore();
    });
  });
});
