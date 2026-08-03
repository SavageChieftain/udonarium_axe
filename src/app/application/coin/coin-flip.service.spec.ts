import { TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { CoinFlipService } from '@axe/application/coin/coin-flip.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { Coin } from '@axe/domain/coin/coin';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CoinFlipService', () => {
  let service: CoinFlipService;
  let sendSystemMessage: ReturnType<typeof vi.fn>;
  const created: { destroy(): void }[] = [];

  function makeCoin(): Coin {
    const coin = Coin.create('コイン');
    coin.location.name = 'table';
    created.push(coin);
    return coin;
  }

  beforeEach(() => {
    PeerCursor.createMyCursor();
    PeerCursor.myCursor.userId = 'me';
    PeerCursor.myCursor.name = 'わたし';
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(CoinFlipService);
    sendSystemMessage = vi
      .spyOn(TestBed.inject(ChatMessageService), 'sendSystemMessage')
      .mockReturnValue(null as unknown as ChatMessage) as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const object of created.splice(0)) object.destroy();
    for (const cursor of ObjectStore.instance.getObjects<PeerCursor>(PeerCursor)) cursor.destroy();
  });

  it('投げた結果がコインに残ること', () => {
    const coin = makeCoin();

    const face = service.flip(coin);

    expect(['front', 'back']).toContain(face);
    expect(coin.face).toBe(face);
  });

  it('結果と投げた人をチャットに流すこと', () => {
    const coin = makeCoin();

    const face = service.flip(coin);

    expect(sendSystemMessage).toHaveBeenCalledOnce();
    const text = sendSystemMessage.mock.calls[0][0] as string;
    expect(text).toContain('わたし');
    expect(text).toContain('コイン');
    expect(text).toContain(service.faceLabel(face));
  });

  it('面のラベルが表と裏になること', () => {
    expect(service.faceLabel('front')).toBe('表');
    expect(service.faceLabel('back')).toBe('裏');
  });
});
