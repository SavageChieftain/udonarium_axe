import { ChatMessageTargetContext } from '@axe/domain/chat/chat-message';
import {
  calcChatTimestamp,
  emitChatMessageEvents,
  findImageIdentifierByName,
  parseTachieCommand,
  resolveChatMessageTag,
  resolveImagePos,
  resolveMessageColor,
  resolveTachieIndex,
  stripTachieCommand,
} from '@axe/shared/chat/chat-message-helpers';
import GameSystemClass from 'bcdice/lib/game_system';

describe('chat-message-helpers', () => {
  describe('resolveTachieIndex', () => {
    it('tachieNum が正数ならその値を返す', () => {
      expect(resolveTachieIndex(2)).toBe(2);
    });

    it('tachieNum が未指定または 0 以下なら 0 を返す', () => {
      expect(resolveTachieIndex(undefined)).toBe(0);
      expect(resolveTachieIndex(0)).toBe(0);
      expect(resolveTachieIndex(-1)).toBe(0);
    });
  });

  describe('resolveMessageColor', () => {
    it('color 未指定ならデフォルト色を返す', () => {
      expect(resolveMessageColor(undefined, '#000000')).toBe('#000000');
    });

    it('color 指定時はそのまま返す', () => {
      expect(resolveMessageColor('#ff0000', '#000000')).toBe('#ff0000');
    });
  });

  describe('resolveChatMessageTag', () => {
    it('gameSystem が null なら空文字を返す', () => {
      const dicebot = {
        checkSecretDiceCommand: vi.fn(),
        checkSecretEditCommand: vi.fn(),
      };
      expect(resolveChatMessageTag(null, 'text', dicebot)).toBe('');
    });

    it('秘匿コマンドなら secret タグを返す', () => {
      const dicebot = {
        checkSecretDiceCommand: vi.fn().mockReturnValue(true),
        checkSecretEditCommand: vi.fn().mockReturnValue(false),
      };
      const gameSystem = { ID: 'Cthulhu' } as GameSystemClass;
      expect(resolveChatMessageTag(gameSystem, 'S1D100<=50', dicebot)).toBe('Cthulhu secret');
    });

    it('通常コマンドなら gameSystem.ID を返す', () => {
      const dicebot = {
        checkSecretDiceCommand: vi.fn().mockReturnValue(false),
        checkSecretEditCommand: vi.fn().mockReturnValue(false),
      };
      const gameSystem = { ID: 'DiceBot' } as GameSystemClass;
      expect(resolveChatMessageTag(gameSystem, '1D100<=50', dicebot)).toBe('DiceBot');
    });
  });

  describe('parseTachieCommand / stripTachieCommand', () => {
    it('hide コマンドを判定できる', () => {
      expect(parseTachieCommand('hello @hide')).toEqual({ type: 'hide' });
    });

    it('数値コマンドを判定できる', () => {
      expect(parseTachieCommand('hello @12')).toEqual({ type: 'index', index: 12 });
    });

    it('名前コマンドを判定できる', () => {
      expect(parseTachieCommand('hello @笑顔')).toEqual({ type: 'name', name: '笑顔' });
    });

    it('末尾コマンドを除去できる', () => {
      expect(stripTachieCommand('hello @hide')).toBe('hello ');
      expect(stripTachieCommand('hello')).toBe('hello');
    });
  });

  describe('findImageIdentifierByName', () => {
    const entries = [
      { label: '通常', identifier: 'id-normal' },
      { label: '笑顔', identifier: 'id-smile' },
      { label: '怒り', identifier: 'id-angry' },
    ];

    it('完全一致を優先して返す', () => {
      expect(findImageIdentifierByName(entries, '笑顔')).toEqual({ identifier: 'id-smile', index: 1 });
    });

    it('完全一致がなければ前方一致を返す', () => {
      expect(findImageIdentifierByName(entries, '怒')).toEqual({ identifier: 'id-angry', index: 2 });
    });

    it('見つからなければ空を返す', () => {
      expect(findImageIdentifierByName(entries, '不存在')).toEqual({ identifier: '', index: 0 });
    });
  });

  describe('calcChatTimestamp', () => {
    it('now が latest 以下なら latest + 1 を返す', () => {
      expect(calcChatTimestamp(1000, 1000)).toBe(1001);
      expect(calcChatTimestamp(999, 1000)).toBe(1001);
    });

    it('now が latest より大きければ now を返す', () => {
      expect(calcChatTimestamp(1002, 1000)).toBe(1002);
    });
  });

  describe('resolveImagePos', () => {
    it('0-11 の範囲内の値ならそのまま返す', () => {
      expect(resolveImagePos(5)).toBe(5);
    });

    it('範囲外は 0 を返す', () => {
      expect(resolveImagePos(-1)).toBe(0);
      expect(resolveImagePos(12)).toBe(0);
    });

    it('未定義は 0 を返す', () => {
      expect(resolveImagePos(undefined)).toBe(0);
    });
  });

  describe('emitChatMessageEvents', () => {
    it('target context なしなら null 宛の send event を 1 件返す', () => {
      const result = emitChatMessageEvents(undefined);
      expect(result.sendTargets).toEqual([null]);
      expect(result.shouldEmitDiceTable).toBe(true);
      expect(result.resourceEditTargetContext).toBeNull();
    });

    it('target context ありなら各 context 分の send event 先を返す', () => {
      const targets: ChatMessageTargetContext[] = [
        { text: 'a', object: null },
        { text: 'b', object: null },
      ];
      const result = emitChatMessageEvents(targets);
      expect(result.sendTargets).toEqual(targets);
      expect(result.resourceEditTargetContext).toEqual(targets);
    });
  });
});
