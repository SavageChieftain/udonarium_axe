import { ChatMessage } from '@axe/domain/chat/chat-message';
import {
  calcIndexRange,
  calcMaxElementHeight,
  findDisplayableTopIndex,
  getBoundedScrollPosition,
  ScrollPosition,
} from '@axe/features/chat/chat-tab/chat-tab-scroll-helpers';

describe('chat-tab-scroll-helpers', () => {
  describe('findDisplayableTopIndex', () => {
    it('表示対象が不足する場合は -1 を返す', () => {
      const messages = [{ isDisplayable: false }, { isDisplayable: true }] as ChatMessage[];

      expect(findDisplayableTopIndex(messages, 2)).toBe(-1);
    });

    it('末尾から displayable を数えて先頭インデックスを返す', () => {
      const messages = [
        { isDisplayable: false },
        { isDisplayable: true },
        { isDisplayable: true },
        { isDisplayable: false },
        { isDisplayable: true },
      ] as ChatMessage[];

      expect(findDisplayableTopIndex(messages, 2)).toBe(2);
    });
  });

  describe('getBoundedScrollPosition', () => {
    it('scrollTop を 0 以上 scrollHeight-clientHeight 以下に収める', () => {
      const panel = {
        scrollTop: -10,
        clientHeight: 100,
        scrollHeight: 240,
      } as HTMLDivElement;
      expect(getBoundedScrollPosition(panel)).toEqual({
        top: 0,
        bottom: 100,
        clientHeight: 100,
        scrollHeight: 240,
      } satisfies ScrollPosition);

      panel.scrollTop = 999;
      expect(getBoundedScrollPosition(panel)).toEqual({
        top: 140,
        bottom: 240,
        clientHeight: 100,
        scrollHeight: 240,
      } satisfies ScrollPosition);
    });
  });

  describe('calcMaxElementHeight', () => {
    it('最小高さより大きい要素高さがあれば最大値を返す', () => {
      const elements = [{ clientHeight: 40 }, { clientHeight: 80 }, { clientHeight: 60 }] as HTMLElement[];
      expect(calcMaxElementHeight(elements, 26)).toBe(80);
    });

    it('要素が空なら最小高さを返す', () => {
      expect(calcMaxElementHeight([], 26)).toBe(26);
    });
  });

  describe('calcIndexRange', () => {
    it('表示領域が完全に外れている場合はスクロール量から再計算する', () => {
      const range = calcIndexRange({
        topIndex: 50,
        bottomIndex: 80,
        chatMessagesLength: 200,
        minMessageHeight: 25,
        maxHeight: 40,
        messageBoxTop: 3000,
        messageBoxBottom: 3200,
        scrollWideTop: 100,
        scrollWideBottom: 200,
        scrollPosition: { top: 120, bottom: 320, clientHeight: 200, scrollHeight: 5000 },
        isIOS: false,
      });

      expect(range.topIndex).toBe(3);
      expect(range.bottomIndex).toBe(13);
    });

    it('通常ケースで上方向の空白を埋めるようにインデックスを拡張する', () => {
      const range = calcIndexRange({
        topIndex: 20,
        bottomIndex: 30,
        chatMessagesLength: 100,
        minMessageHeight: 25,
        maxHeight: 50,
        messageBoxTop: 500,
        messageBoxBottom: 1000,
        scrollWideTop: 300,
        scrollWideBottom: 900,
        scrollPosition: { top: 450, bottom: 850, clientHeight: 400, scrollHeight: 2000 },
        isIOS: false,
      });

      expect(range.topIndex).toBe(15);
      expect(range.bottomIndex).toBe(28);
    });
  });
});
