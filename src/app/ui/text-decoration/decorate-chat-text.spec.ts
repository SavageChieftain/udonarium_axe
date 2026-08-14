import {
  applyRubyMarkup,
  decorateChatStyleText,
  decorateQuoteLines,
  escapeHtml,
} from '@axe/ui/text-decoration/decorate-chat-text';

describe('decorate-chat-text', () => {
  describe('escapeHtml', () => {
    it('escapes the html special characters', () => {
      expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    });

    it('turns a non-string into text', () => {
      expect(escapeHtml(42)).toBe('42');
      expect(escapeHtml(null)).toBe('null');
    });
  });

  describe('applyRubyMarkup', () => {
    it('turns the ruby notation into a ruby element', () => {
      const result = applyRubyMarkup('|漢字《かんじ》');
      expect(result).toBe('<ruby class="chat-ruby"><rb>漢字</rb><rt>かんじ</rt></ruby>');
    });

    it('accepts the full-width pipe too', () => {
      const result = applyRubyMarkup('｜熟語《じゅくご》');
      expect(result).toBe('<ruby class="chat-ruby"><rb>熟語</rb><rt>じゅくご</rt></ruby>');
    });
  });

  describe('decorateQuoteLines', () => {
    it('wraps a line beginning with an angle bracket in a quote element', () => {
      expect(decorateQuoteLines('hello\n&gt; quoted\nworld')).toBe(
        'hello\n<span class="chat-quote">quoted</span>\nworld'
      );
    });

    it('gathers consecutive quoted lines into one quote', () => {
      expect(decorateQuoteLines('&gt; line 1\n&gt; line 2')).toBe('<span class="chat-quote">line 1<br>line 2</span>');
    });

    it('leaves text with no quote marker alone', () => {
      expect(decorateQuoteLines('plain text')).toBe('plain text');
    });
  });

  describe('decorateChatStyleText, all of it at once', () => {
    it('escapes, then rubies, then quotes', () => {
      const input = '> @勇者\n> こんにちは|世界《せかい》';
      const result = decorateChatStyleText(input);
      expect(result).toContain('<span class="chat-quote">');
      expect(result).toContain('@勇者');
      expect(result).toContain('<ruby class="chat-ruby"><rb>世界</rb><rt>せかい</rt></ruby>');
    });

    it('escapes html-looking input inside a quote before decorating it', () => {
      const result = decorateChatStyleText('> <b>not bold</b>');
      expect(result).toBe('<span class="chat-quote">&lt;b&gt;not bold&lt;/b&gt;</span>');
    });
  });
});
