import { TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { PeerRole } from '@axe/domain/peer/peer-role';
import { VisualNovelEmoteSelectionService } from '@axe/features/visual-novel/visual-novel-emote-selection.service';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

describe('VisualNovelEmoteSelectionService', () => {
  let service: VisualNovelEmoteSelectionService;

  beforeEach(() => {
    PeerCursor.createMyCursor();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    service = TestBed.inject(VisualNovelEmoteSelectionService);
    service.reset();
  });

  afterEach(() => {
    PeerCursor.myCursor.role = PeerRole.Player;
  });

  it('starts with nothing chosen', () => {
    expect(service.hasSelection()).toBe(false);
    expect(service.emote()).toEqual({
      kind: 'normal',
      shape: 'normal',
      bubbleAnimation: 'none',
      portraitEmote: 'none',
      emotionMark: 'none',
      flipped: false,
      exited: false,
    });
  });

  it('gathers what has been chosen into one expression', () => {
    service.shape.set('shout');
    service.portraitEmote.set('tremble');

    expect(service.hasSelection()).toBe(true);
    expect(service.emote().shape).toBe('shout');
    expect(service.emote().portraitEmote).toBe('tremble');
  });

  it('leaves the flip to the character it belongs to', () => {
    service.shape.set('shout');
    expect(service.emote().flipped).toBe(false);
  });

  it('puts everything back', () => {
    service.shape.set('shout');
    service.toggleExit();

    service.reset();

    expect(service.hasSelection()).toBe(false);
    expect(service.exited()).toBe(false);
  });

  it('offers a scene change only to the game master', () => {
    expect(service.messageKindOptions()).not.toContain('scene');

    PeerCursor.myCursor.role = PeerRole.GameMaster;
    TestBed.inject(ObjectChangeService).notifyChanged(PeerCursor.myCursor.identifier);

    expect(service.messageKindOptions()).toContain('scene');
  });
});
