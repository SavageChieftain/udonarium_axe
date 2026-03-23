import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { GameCharacter } from '@axe/class/game-character';

describe('GameCharacter', () => {
  let character: GameCharacter;

  beforeEach(() => {
    character = new GameCharacter('test-id');
  });

  afterEach(() => {
    ObjectStore.instance.remove(character);
  });

  // ----------------------------------------------------------------
  // aliasName
  // ----------------------------------------------------------------
  describe('aliasName', () => {
    it("リテラル型 'character' を返す", () => {
      expect(character.aliasName).toBe('character');
    });
  });

  // ----------------------------------------------------------------
  // chatBubbleAltitude
  // ----------------------------------------------------------------
  describe('chatBubbleAltitude', () => {
    it('初期値は 0', () => {
      expect(character.chatBubbleAltitude).toBe(0);
    });

    it('数値を設定できる', () => {
      character.chatBubbleAltitude = 120;
      expect(character.chatBubbleAltitude).toBe(120);
    });
  });

  // ----------------------------------------------------------------
  // specifyKomaImageFlag / komaImageHeight
  // ----------------------------------------------------------------
  describe('specifyKomaImageFlag', () => {
    it('初期値は false', () => {
      expect(character.specifyKomaImageFlag).toBe(false);
    });
  });

  describe('komaImageHeight', () => {
    it('初期値は 100', () => {
      expect(character.komaImageHeight).toBe(100);
    });
  });
});
