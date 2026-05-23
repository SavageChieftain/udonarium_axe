import {
  applyRubyMarkup,
  decorateChatStyleText,
  decorateQuoteLines,
  escapeHtml,
} from '@axe/ui/text-decoration/decorate-chat-text';

describe('decorate-chat-text', () => {
  describe('escapeHtml', () => {
    it('HTML特殊文字をエスケープする', () => {
      expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    });

    it('非文字列はStringに変換する', () => {
      expect(escapeHtml(42)).toBe('42');
      expect(escapeHtml(null)).toBe('null');
    });
  });

  describe('applyRubyMarkup', () => {
    it('|本文《ルビ》 を ruby 要素に変換する', () => {
      const result = applyRubyMarkup('|漢字《かんじ》');
      expect(result).toBe('<ruby class="chat-ruby"><rb>漢字</rb><rt>かんじ</rt></ruby>');
    });

    it('全角パイプも変換する', () => {
      const result = applyRubyMarkup('｜熟語《じゅくご》');
      expect(result).toBe('<ruby class="chat-ruby"><rb>熟語</rb><rt>じゅくご</rt></ruby>');
    });
  });

  describe('decorateQuoteLines', () => {
    it('> 始まりの行を chat-quote 要素で包む', () => {
      expect(decorateQuoteLines('hello\n&gt; quoted\nworld')).toBe(
        'hello\n<span class="chat-quote">quoted</span>\nworld'
      );
    });

    it('連続する > 行は1つの chat-quote にまとめる', () => {
      expect(decorateQuoteLines('&gt; line 1\n&gt; line 2')).toBe('<span class="chat-quote">line 1<br>line 2</span>');
    });

    it('> が無いテキストは変換しない', () => {
      expect(decorateQuoteLines('plain text')).toBe('plain text');
    });
  });

  describe('decorateChatStyleText (一括処理)', () => {
    it('エスケープ → ルビ → 引用 を順に適用する', () => {
      const input = '> @勇者\n> こんにちは|世界《せかい》';
      const result = decorateChatStyleText(input);
      expect(result).toContain('<span class="chat-quote">');
      expect(result).toContain('@勇者');
      expect(result).toContain('<ruby class="chat-ruby"><rb>世界</rb><rt>せかい</rt></ruby>');
    });

    it('引用行内の HTML 風入力もエスケープしてから装飾する', () => {
      const result = decorateChatStyleText('> <b>not bold</b>');
      expect(result).toBe('<span class="chat-quote">&lt;b&gt;not bold&lt;/b&gt;</span>');
    });
  });
});
