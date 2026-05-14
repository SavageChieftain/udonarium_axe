import { Network } from '@axe/core/index';
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
  vi.spyOn(Network, 'peerContexts', 'get').mockReturnValue(contexts as never);
}

describe('allowsChat()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

  it('spy 経由で差し替えた peerContexts が production の Network 参照経由でも観測できる', () => {
    setPeerContexts([{ peerId: 'p1', isOpen: true }]);
    expect(Network.peerContexts).toEqual([{ peerId: 'p1', isOpen: true }]);
  });
});
