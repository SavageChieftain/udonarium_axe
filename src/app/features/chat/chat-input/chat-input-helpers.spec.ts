import { Network } from '@axe/core/index';
import { Network as NetworkClass } from '@axe/core/network/network';
import { GameCharacter } from '@axe/domain/character/game-character';
import { allowsChat } from '@axe/features/chat/chat-input/chat-input-helpers';

interface MutableCharacter {
  location: { name: string };
  nonTalkFlag: boolean;
}

function makeCharacter(locationName: string, nonTalkFlag = false): MutableCharacter {
  return { location: { name: locationName }, nonTalkFlag };
}

function setPeerContexts(contexts: Array<{ peerId: string; isOpen: boolean }>): void {
  // Network export は Network.instance を指すので、その peerContexts getter を差し替える。
  Object.defineProperty(NetworkClass.instance, 'peerContexts', {
    configurable: true,
    get: () => contexts,
  });
}

describe('allowsChat()', () => {
  afterEach(() => {
    // 元の getter に戻す（テスト間汚染防止）
    setPeerContexts([]);
  });

  it('table 配置 + nonTalkFlag=false なら true', () => {
    const c = makeCharacter('table');
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(true);
  });

  it('table 配置 + nonTalkFlag=true なら false（ignoreNonTalk=false 時）', () => {
    const c = makeCharacter('table', true);
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(false);
  });

  it('table 配置 + nonTalkFlag=true + ignoreNonTalk=true なら true', () => {
    const c = makeCharacter('table', true);
    expect(allowsChat(c as unknown as GameCharacter, 'me', true)).toBe(true);
  });

  it('自分のインベントリ (peerId=myPeerId) なら true', () => {
    const c = makeCharacter('me');
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(true);
  });

  it('自分のインベントリでも nonTalkFlag=true なら false', () => {
    const c = makeCharacter('me', true);
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(false);
  });

  it('graveyard なら常に false', () => {
    expect(allowsChat(makeCharacter('graveyard') as unknown as GameCharacter, 'me')).toBe(false);
    expect(allowsChat(makeCharacter('graveyard', true) as unknown as GameCharacter, 'me', true)).toBe(false);
  });

  it('他のピア (open) のインベントリ配下なら false', () => {
    setPeerContexts([{ peerId: 'other', isOpen: true }]);
    const c = makeCharacter('other');
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(false);
  });

  it('他のピア (closed) のインベントリ配下なら true', () => {
    setPeerContexts([{ peerId: 'other', isOpen: false }]);
    const c = makeCharacter('other');
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(true);
  });

  it('Network import 経由でも同じ singleton を参照することを確認', () => {
    setPeerContexts([{ peerId: 'p1', isOpen: true }]);
    // Network is exported as Network.instance from @axe/core/index
    expect(Network.peerContexts).toEqual([{ peerId: 'p1', isOpen: true }]);
  });
});
