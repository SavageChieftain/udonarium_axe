import { emptyHotbarSlotDraft, encodeHotbarSlotDraft, parseHotbarSlotDraft } from '@axe/domain/hotbar/hotbar-draft';

describe('carrying a hotbar slot about', () => {
  it('starts a draft on the kind it was asked for', () => {
    expect(emptyHotbarSlotDraft('sound')).toEqual({
      kind: 'sound',
      value: '',
      valueName: '',
      characterIdentifier: '',
      characterName: '',
      label: '',
      icon: '',
      color: '',
      payload: { kind: 'sound', local: false },
    });
  });

  it('reads back what it wrote', () => {
    const draft = emptyHotbarSlotDraft('cutIn');
    draft.value = 'cut-in-1';
    draft.label = '幕間';
    draft.payload = { kind: 'cutIn', soundOnly: true };

    expect(parseHotbarSlotDraft(encodeHotbarSlotDraft(draft))).toEqual(draft);
  });

  it('carries which character a slot acts as, by name as well as by identifier', () => {
    const draft = emptyHotbarSlotDraft('chat');
    draft.value = '2d6';
    draft.characterIdentifier = 'character-1';
    draft.characterName = '術者';

    const read = parseHotbarSlotDraft(encodeHotbarSlotDraft(draft));

    expect(read?.characterIdentifier).toBe('character-1');
    expect(read?.characterName).toBe('術者');
  });

  it('refuses what is not a slot at all', () => {
    expect(parseHotbarSlotDraft('not json')).toBeNull();
    expect(parseHotbarSlotDraft('')).toBeNull();
    expect(parseHotbarSlotDraft('{"text":"just some copied words"}')).toBeNull();
    expect(parseHotbarSlotDraft(null)).toBeNull();
  });

  it('takes a slot from a newer version as a chat macro rather than dropping it', () => {
    const draft = parseHotbarSlotDraft('{"kind":"teleport","value":"2d6"}');

    expect(draft).toMatchObject({ kind: 'chat', value: '2d6' });
  });
});
