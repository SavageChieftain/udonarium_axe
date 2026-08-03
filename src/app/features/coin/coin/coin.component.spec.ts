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

  it('両面に紋章を彫り、向きで回転させること', () => {
    fixture.detectChanges();
    const titles = [...fixture.nativeElement.querySelectorAll('svg title')].map(
      (title: SVGTitleElement) => title.textContent
    );
    expect(titles).toEqual(['表', '裏']);
    expect(fixture.nativeElement.querySelectorAll('svg polygon').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('svg ellipse')).toHaveLength(component.laurelLeaves.length * 2);
    expect(component.faceTransform()).toContain('rotateY(0deg)');

    coin.face = 'back';
    TestBed.inject(ObjectChangeService).notifyChanged(coin.identifier);
    expect(component.faceTransform()).toContain('rotateY(180deg)');
  });

  it('厚みの分だけ両面を離し、縁を円周に並べること', () => {
    fixture.detectChanges();
    const half = component.thickness() / 2;

    expect(component.thickness()).toBeGreaterThan(0);
    expect(component.frontFaceTransform()).toBe(`translateZ(${half}px)`);
    expect(component.backFaceTransform()).toBe(`rotateY(180deg) translateZ(${half}px)`);

    const segments = component.edgeSegments();
    expect(segments).toHaveLength(24);
    expect(segments[0].transform).toBe(`rotateZ(0deg) translateY(${-component.diameter() / 2}px) rotateX(90deg)`);
    expect(segments[6].transform).toContain('rotateZ(90deg)');
    expect(segments.every((segment) => segment.height === `${component.thickness()}px`)).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('div[style*="rotateX(90deg)"]')).toHaveLength(24);
  });

  it('投げると面が決まること', () => {
    vi.useFakeTimers();
    try {
      component.flip();
      vi.runAllTimers();

      expect(['front', 'back']).toContain(coin.face);
    } finally {
      vi.useRealTimers();
    }
  });

  it('コインを投げた通知で回転が始まること', () => {
    vi.useFakeTimers();
    try {
      expect(component.isSpinning()).toBe(false);

      localDispatch('FLIP_COIN', { identifier: coin.identifier, face: 'back' });
      vi.runAllTimers();

      expect(component.isSpinning()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('別のコインの通知では回転しないこと', () => {
    vi.useFakeTimers();
    try {
      localDispatch('FLIP_COIN', { identifier: 'other-coin', face: 'back' });
      vi.runAllTimers();

      expect(component.isSpinning()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('回っている間は結果を見せず、着地してから見せること', () => {
    vi.useFakeTimers();
    try {
      localDispatch('FLIP_COIN', { identifier: coin.identifier, face: 'back' });
      vi.runAllTimers();
      coin.face = 'back';
      TestBed.inject(ObjectChangeService).notifyChanged(coin.identifier);

      expect(component.displayedFace()).toBe('front');
      expect(component.faceTransform()).toContain('rotateY(0deg)');

      component.onSpinEnd();

      expect(component.displayedFace()).toBe('back');
      expect(component.faceTransform()).toContain('rotateY(180deg)');
    } finally {
      vi.useRealTimers();
    }
  });

  it('面が変わる投げだけ半回転ぶん多く回すこと', () => {
    vi.useFakeTimers();
    try {
      localDispatch('FLIP_COIN', { identifier: coin.identifier, face: 'back' });
      vi.runAllTimers();
      expect(component.landsOnOtherFace()).toBe(true);

      component.onSpinEnd();
      localDispatch('FLIP_COIN', { identifier: coin.identifier, face: 'front' });
      vi.runAllTimers();
      expect(component.landsOnOtherFace()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('自分の投げがネットワークから戻ってきても回し直さないこと', () => {
    vi.useFakeTimers();
    try {
      localDispatch('FLIP_COIN', { identifier: coin.identifier, face: 'back' });
      vi.runAllTimers();
      component.isSpinning.set(true);

      localDispatch('FLIP_COIN', { identifier: coin.identifier, face: 'back' });
      vi.runAllTimers();

      expect(component.isSpinning()).toBe(true);
      expect(component.displayedFace()).toBe('front');
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
