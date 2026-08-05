import { TestBed } from '@angular/core/testing';
import { EffectCastService } from '@axe/application/effect/effect-cast.service';
import { EffectLibraryService } from '@axe/application/effect/effect-library.service';
import { emitResourceEditMessage } from '@axe/core/event/domain-events';
import { IPeerContext } from '@axe/core/network/peer-context';
import { resetPeerContextProvider, setPeerContextProvider } from '@axe/core/network/peer-context-source';
import { PeerSessionGrade } from '@axe/core/network/peer-session-state';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { EffectChatEventHandlerService } from '@axe/features/effect/effect-chat-event-handler.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('EffectChatEventHandlerService', () => {
  let castStub: { fire: ReturnType<typeof vi.fn>; candidateTargets: ReturnType<typeof vi.fn> };
  let preset: EffectPreset;
  let target: GameCharacter;
  let caster: GameCharacter;

  const SELF_USER_ID = 'user-self';

  /** 自分の発言かどうかは peer context の userId で決まる。周囲の状態に左右されないよう固定する。 */
  function fixPeerContext(): void {
    const self = {
      peerId: 'peer-self',
      userId: SELF_USER_ID,
      roomId: '',
      roomName: '',
      password: '',
      digestUserId: '',
      digestRoomName: '',
      digestPassword: '',
      isOpen: true,
      isRoom: false,
      hasPassword: false,
      session: { grade: PeerSessionGrade.UNSPECIFIED, name: '', isVisitor: false },
    } as unknown as IPeerContext;
    setPeerContextProvider({ peerContext: self, peerContexts: [self], peerIds: [self.peerId], peerId: self.peerId });
  }

  function addMessage(text: string, sendFrom: string, fromSelf = true): ChatMessage {
    const message = new ChatMessage();
    message.text = text;
    message.sendFrom = sendFrom;
    message.from = fromSelf ? SELF_USER_ID : 'someone-else';
    message.originFrom = message.from;
    message.initialize();
    return message;
  }

  beforeEach(() => {
    fixPeerContext();
    PeerCursor.createMyCursor();
    castStub = { fire: vi.fn(), candidateTargets: vi.fn().mockReturnValue([]) };
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    TestBed.overrideProvider(EffectCastService, { useValue: castStub });
    TestBed.inject(EffectChatEventHandlerService);

    preset = new EffectPreset();
    preset.name = '爆炎';
    preset.initialize();

    target = GameCharacter.create('的', 1, '');
    caster = GameCharacter.create('術者', 1, '');
    castStub.candidateTargets.mockReturnValue([target]);
  });

  afterEach(() => {
    resetPeerContextProvider();
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.delete(object, false);
    ObjectStore.instance.clearDeleteHistory();
  });

  it('演出トークンで発動すること', () => {
    const message = addMessage('2d6+3 t:HP-10 《爆炎》', caster.identifier);

    // 発火しなかったときにどの条件で弾かれたか分かるよう、前提を先に確かめる。
    expect(message.isSendFromSelf).toBe(true);
    expect(message.isSystem).toBe(false);
    expect(TestBed.inject(EffectLibraryService).findByName('爆炎')).toBe(preset);

    emitResourceEditMessage({ messageIdentifier: message.identifier, messageTargetContext: null });

    expect(castStub.fire).toHaveBeenCalledTimes(1);
    const [firedPreset, targets, firedCaster] = castStub.fire.mock.calls[0];
    expect(firedPreset).toBe(preset);
    expect(targets).toEqual([target]);
    // 撃ち手は選択中のコマではなく、その行を喋ったコマ。
    expect(firedCaster).toBe(caster);
  });

  it('リソース操作の対象を優先すること', () => {
    const message = addMessage('《爆炎》', caster.identifier);

    emitResourceEditMessage({
      messageIdentifier: message.identifier,
      messageTargetContext: [{ text: 'HP-10', object: target }],
    });

    expect(castStub.fire.mock.calls[0][1]).toEqual([target]);
  });

  it('トークンが無ければ何もしないこと', () => {
    const message = addMessage('2d6+3 t:HP-10', caster.identifier);

    emitResourceEditMessage({ messageIdentifier: message.identifier, messageTargetContext: null });

    expect(castStub.fire).not.toHaveBeenCalled();
  });

  it('知らない名前なら何もしないこと', () => {
    const message = addMessage('《存在しない演出》', caster.identifier);

    emitResourceEditMessage({ messageIdentifier: message.identifier, messageTargetContext: null });

    expect(castStub.fire).not.toHaveBeenCalled();
  });

  it('他人の発言では発動しないこと', () => {
    // 全員が走らせると、人数ぶん演出が重なってしまう。
    const message = addMessage('《爆炎》', caster.identifier, false);

    emitResourceEditMessage({ messageIdentifier: message.identifier, messageTargetContext: null });

    expect(castStub.fire).not.toHaveBeenCalled();
  });
});
