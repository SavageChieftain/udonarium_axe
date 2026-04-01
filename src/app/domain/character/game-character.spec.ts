import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';

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

  // ----------------------------------------------------------------
  // imageFile null safety
  // ----------------------------------------------------------------
  describe('imageFile', () => {
    it('imageDataElementが無い場合はImageFile.Emptyを返す', () => {
      expect(character.imageFile).toBeDefined();
      expect(character.imageFile.url).toBe('');
    });
  });

  // ----------------------------------------------------------------
  // buffs (キャッシュ)
  // ----------------------------------------------------------------
  describe('buffs', () => {
    it('createDataElements後に複数回呼び出しても同一インスタンスを返す', () => {
      character.createDataElements();
      expect(character.buffs).toBe(character.buffs);
    });
  });

  // ----------------------------------------------------------------
  // status (キャッシュ)
  // ----------------------------------------------------------------
  describe('status', () => {
    it('createDataElements後に複数回呼び出しても同一インスタンスを返す', () => {
      character.createDataElements();
      expect(character.status).toBe(character.status);
    });
  });
});
