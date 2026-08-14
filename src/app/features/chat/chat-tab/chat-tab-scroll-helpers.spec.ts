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
    it('returns nothing when there is not enough to show', () => {
      const messages = [{ isDisplayable: false }, { isDisplayable: true }] as ChatMessage[];

      expect(findDisplayableTopIndex(messages, 2)).toBe(-1);
    });

    it('counts back from the end to find the first line to show', () => {
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
    it('keeps the scroll between the top and the bottom', () => {
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
    it('takes the larger of the element and the smallest height', () => {
      const elements = [{ clientHeight: 40 }, { clientHeight: 80 }, { clientHeight: 60 }] as HTMLElement[];
      expect(calcMaxElementHeight(elements, 26)).toBe(80);
    });

    it('returns the smallest height for an empty element', () => {
      expect(calcMaxElementHeight([], 26)).toBe(26);
    });
  });

  describe('calcIndexRange', () => {
    it('works it out again from the scroll when the view has moved right off', () => {
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

    it('widens the range to fill the blank above', () => {
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
