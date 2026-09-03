import { TestBed } from '@angular/core/testing';
import { emitSendMessage } from '@axe/core/event/domain-events';
import { IPeerContext } from '@axe/core/network/peer-context';
import { resetPeerContextProvider, setPeerContextProvider } from '@axe/core/network/peer-context-source';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';

describe('PresetSound', () => {
  it('starts with no sound for picking a die up', () => {
    expect(PresetSound.dicePick).toBe('');
  });

  it('starts with none for putting one down', () => {
    expect(PresetSound.dicePut).toBe('');
  });

  it('starts with none for the first roll', () => {
    expect(PresetSound.diceRoll1).toBe('');
  });

  it('starts with none for the second', () => {
    expect(PresetSound.diceRoll2).toBe('');
  });

  it('starts with none for drawing a card', () => {
    expect(PresetSound.cardDraw).toBe('');
  });

  it('starts with none for shuffling', () => {
    expect(PresetSound.cardShuffle).toBe('');
  });

  it('starts with none for the alarm', () => {
    expect(PresetSound.alarm).toBe('');
  });
});

describe('SoundEffect', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  describe('creating one', () => {
    it('can be created', () => {
      const se = new SoundEffect();
      se.initialize();
      expect(se).toBeTruthy();
    });
  });

  describe('static play()', () => {
    it('takes a string', () => {
      // calls through without throwing
      SoundEffect.play('test-identifier');
    });
  });

  describe('instance play()', () => {
    it('takes a string', () => {
      const se = new SoundEffect();
      se.initialize();
      se.play('test-identifier');
    });
  });

  describe('playing a dice sound on a message', () => {
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

    it('plays for a dice bot message', async () => {
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

    it('plays for nothing else', async () => {
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
