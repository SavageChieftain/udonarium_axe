import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { buildMacroMessage } from '@axe/domain/chat/character-macro';

describe('building a macro message', () => {
  let store: ObjectStore;

  function speaker(name: string, palette?: string): GameCharacter {
    const character = GameCharacter.create(name, 1, '');
    if (palette !== undefined) character.chatPalette?.setPalette(palette);
    return character;
  }

  function withoutPalette(name: string): GameCharacter {
    const character = GameCharacter.create(name, 1, '');
    character.chatPalette?.destroy();
    return character;
  }

  beforeEach(() => {
    store = ObjectStore.instance;
  });

  afterEach(() => {
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  it('fills in what a line refers to and keeps one context for the speaker alone', () => {
    const character = speaker('術者', '//威力=7');

    const message = buildMacroMessage(character, '2d6+{威力} 攻撃', [], '対象なし');

    expect(message.text).toBe('2d6+7 攻撃');
    expect(message.targetContexts).toEqual([{ text: '2d6+7 攻撃', object: null }]);
    expect(message.attachmentImageIdentifiers).toEqual([]);
  });

  it('works a line aimed at the marked pieces out once for each of them', () => {
    const character = speaker('術者', '');
    const first = speaker('相手A');
    const second = speaker('相手B');

    const message = buildMacroMessage(character, '攻撃 t:HP-5', [first, second], '対象なし');

    expect(message.text).toBe('攻撃 t:HP-5 [相手A]\n攻撃 t:HP-5 [相手B]');
    expect(message.targetContexts.map((context) => context.object?.name)).toEqual(['相手A', '相手B']);
  });

  it('takes the commands aimed at the speaker out from the second target onwards', () => {
    const character = speaker('術者', '');
    const first = speaker('相手A');
    const second = speaker('相手B');

    const message = buildMacroMessage(character, 't:HP-5 :MP-1 攻撃', [first, second], '対象なし');

    expect(message.text.split('\n')[0]).toContain(':MP-1');
    expect(message.text.split('\n')[1]).not.toContain(':MP-1');
  });

  it('says so, and marks nobody, when the line wants a target and none is marked', () => {
    const character = speaker('術者', '');

    const message = buildMacroMessage(character, '攻撃 t:HP-5', [], '対象がいません');

    expect(message.text).toBe('対象がいません');
    expect(message.targetContexts).toEqual([]);
  });

  it('speaks for a character that keeps no palette of its own', () => {
    const character = withoutPalette('パレット無し');

    const message = buildMacroMessage(character, 'こんばんは', [], '対象なし');

    expect(message.text).toBe('こんばんは');
    expect(message.targetContexts).toHaveLength(1);
  });
});
