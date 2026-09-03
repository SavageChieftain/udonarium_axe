import { TestBed } from '@angular/core/testing';
import { ChatSpeakerService } from '@axe/application/chat/chat-speaker.service';
import { GameCharacter } from '@axe/domain/character/game-character';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('ChatSpeakerService', () => {
  let service: ChatSpeakerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(ChatSpeakerService);
  });

  afterEach(() => {
    PeerCursor.myCursor = null!;
  });

  it('speaks as nobody until the chat says otherwise', () => {
    expect(service.current()).toBeNull();
  });

  it('names the piece the chat is set to', () => {
    const character = GameCharacter.create('発言者', 1, '');

    service.set(character.identifier);

    expect(service.current()).toBe(character);
    expect(service.identifier()).toBe(character.identifier);
  });

  it('names no piece when the chat speaks as the reader', () => {
    PeerCursor.createMyCursor();

    service.set(PeerCursor.myCursor.identifier);

    expect(service.current()).toBeNull();
  });

  it('names no piece once the one it named is gone', () => {
    const character = GameCharacter.create('去った者', 1, '');
    service.set(character.identifier);
    character.destroy();

    expect(service.current()).toBeNull();
  });
});
