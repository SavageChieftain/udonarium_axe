import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatMessageService } from '@axe/application/chat/chat-message.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { localDispatch } from '@axe/core/network/network-messaging';
import { ChatMessage } from '@axe/domain/chat/chat-message';
import { Coin } from '@axe/domain/coin/coin';
import { CoinComponent } from '@axe/features/coin/coin/coin.component';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('CoinComponent', () => {
  let component: CoinComponent;
  let fixture: ComponentFixture<CoinComponent>;
  let coin: Coin;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CoinComponent],
      providers: [...TEST_PROVIDERS],
    }).compileComponents();

    fixture = TestBed.createComponent(CoinComponent);
    component = fixture.componentInstance;
    coin = Coin.create('コイン');
    coin.location.name = 'table';
    fixture.componentRef.setInput('coin', coin);
    vi.spyOn(TestBed.inject(ChatMessageService), 'sendSystemMessage').mockReturnValue(null as unknown as ChatMessage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    coin.destroy();
  });

  it('表と裏の両方を描き、向きで回転させること', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('表');
    expect(fixture.nativeElement.textContent).toContain('裏');
    expect(component.faceTransform()).toBe('rotateY(0deg)');

    coin.face = 'back';
    TestBed.inject(ObjectChangeService).notifyChanged(coin.identifier);
    expect(component.faceTransform()).toBe('rotateY(180deg)');
  });

  it('投げると面が決まること', () => {
    component.flip();

    expect(['front', 'back']).toContain(coin.face);
  });

  it('コインを投げた通知で回転が始まること', () => {
    vi.useFakeTimers();
    try {
      expect(component.isSpinning()).toBe(false);

      localDispatch('FLIP_COIN', { identifier: coin.identifier });
      vi.runAllTimers();

      expect(component.isSpinning()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('別のコインの通知では回転しないこと', () => {
    vi.useFakeTimers();
    try {
      localDispatch('FLIP_COIN', { identifier: 'other-coin' });
      vi.runAllTimers();

      expect(component.isSpinning()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('回転が終わったら状態を戻すこと', () => {
    component.isSpinning.set(true);

    component.onSpinEnd();

    expect(component.isSpinning()).toBe(false);
  });
});
