import { answerColorsOf, chatBubbleOf, chatColorOf, DEFAULT_CHAT_COLOR } from '@axe/domain/chat/chat-color';

describe('chat colours', () => {
  const speaker = {
    chatColorCode: ['#ff0000', '#00ff00', '#0000ff'],
    chatBubbleLight: ['#fee', '', '#eef'],
    chatBubbleDark: ['#300', '#030'],
  };

  it('gives the colour asked for', () => {
    expect(chatColorOf(speaker, 0)).toBe('#ff0000');
    expect(chatColorOf(speaker, 2)).toBe('#0000ff');
  });

  it('falls back to black for nobody, and for a colour nobody chose', () => {
    expect(chatColorOf(null, 0)).toBe(DEFAULT_CHAT_COLOR);
    expect(chatColorOf(undefined, 1)).toBe(DEFAULT_CHAT_COLOR);
    expect(chatColorOf({ chatColorCode: [] }, 0)).toBe(DEFAULT_CHAT_COLOR);
    expect(chatColorOf(speaker, 7)).toBe(DEFAULT_CHAT_COLOR);
  });

  it('gives both bubbles of a colour, and nothing where none was asked for', () => {
    expect(chatBubbleOf(speaker, 0)).toEqual({ light: '#fee', dark: '#300' });
    expect(chatBubbleOf(speaker, 1)).toEqual({ light: '', dark: '#030' });
    expect(chatBubbleOf(speaker, 2)).toEqual({ light: '#eef', dark: '' });
    expect(chatBubbleOf(null, 0)).toEqual({ light: '', dark: '' });
  });
});

describe('answerColorsOf()', () => {
  it('takes the text colour and the bubble of the line it answers', () => {
    expect(answerColorsOf({ messColor: '#ff0000', messBubbleLight: '#ffeeee', messBubbleDark: '#330000' })).toEqual({
      messColor: '#ff0000',
      messBubbleLight: '#ffeeee',
      messBubbleDark: '#330000',
    });
  });

  it('asks for no bubble where the line it answers asked for none', () => {
    expect(answerColorsOf({ messColor: '#ff0000' })).toEqual({
      messColor: '#ff0000',
      messBubbleLight: undefined,
      messBubbleDark: undefined,
    });
  });
});
