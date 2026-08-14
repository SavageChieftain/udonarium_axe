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

  it('is true for a piece on the table that may speak', () => {
    const c = makeCharacter('table');
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(true);
  });

  it('is false for one that may not', () => {
    const c = makeCharacter('table', true);
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(false);
  });

  it('is true for one that may not when that is ignored', () => {
    const c = makeCharacter('table', true);
    expect(allowsChat(c as unknown as GameCharacter, 'me', true)).toBe(true);
  });

  it('is true for a piece in your own hands', () => {
    const c = makeCharacter('me');
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(true);
  });

  it('is false for one there that may not speak', () => {
    const c = makeCharacter('me', true);
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(false);
  });

  it('is always false in the graveyard', () => {
    expect(allowsChat(makeCharacter('graveyard') as unknown as GameCharacter, 'me')).toBe(false);
    expect(allowsChat(makeCharacter('graveyard', true) as unknown as GameCharacter, 'me', true)).toBe(false);
  });

  it('is false in the open hands of another peer', () => {
    setPeerContexts([{ peerId: 'other', isOpen: true }]);
    const c = makeCharacter('other');
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(false);
  });

  it('is true in their closed ones', () => {
    setPeerContexts([{ peerId: 'other', isOpen: false }]);
    const c = makeCharacter('other');
    expect(allowsChat(c as unknown as GameCharacter, 'me')).toBe(true);
  });

  it('sees the swapped peer contexts through the real network reference', () => {
    setPeerContexts([{ peerId: 'p1', isOpen: true }]);
    expect(Network.peerContexts).toEqual([{ peerId: 'p1', isOpen: true }]);
  });
});
