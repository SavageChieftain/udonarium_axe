/* チャットと共有メモで共用するテキスト装飾ユーティリティ。
   生のテキスト文字列を受け取り、HTML エスケープ → ルビ → 引用ブロック装飾を順に適用した HTML を返す。
   ChatMessageComponent (live chat) と TextNoteComponent (非編集モード) が同じ見た目で描画するために使う。 */

const HTML_ESCAPE_MAP: Readonly<Record<string, string>> = {
  '&': '&amp;',
  "'": '&#x27;',
  '`': '&#x60;',
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
};

export function escapeHtml(text: unknown): string {
  if (typeof text !== 'string') return String(text);
  return text.replace(/[&'`"<>]/g, (match) => HTML_ESCAPE_MAP[match] ?? match);
}

export function applyRubyMarkup(escapedHtml: string): string {
  return escapedHtml
    .replace(/[|｜]([^|｜\s]+?)《(.+?)》/g, '<ruby class="chat-ruby"><rb>$1</rb><rt>$2</rt></ruby>')
    .replace(/\\s/g, ' ');
}

export function decorateQuoteLines(html: string): string {
  const lines = html.split('\n');
  const parts: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const match = /^&gt;\s?(.*)$/.exec(lines[i]);
    if (match) {
      const buffer: string[] = [match[1]];
      i++;
      while (i < lines.length) {
        const inner = /^&gt;\s?(.*)$/.exec(lines[i]);
        if (!inner) break;
        buffer.push(inner[1]);
        i++;
      }
      parts.push(`<span class="chat-quote">${buffer.join('<br>')}</span>`);
    } else {
      parts.push(lines[i]);
      i++;
    }
  }
  return parts.join('\n');
}

/** HTML エスケープ → ルビ記法 (`|word《reading》`) → 引用行 (`> ...`) を順に装飾する */
export function decorateChatStyleText(text: string): string {
  return decorateQuoteLines(applyRubyMarkup(escapeHtml(text)));
}
