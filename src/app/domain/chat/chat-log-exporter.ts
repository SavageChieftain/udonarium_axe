import type { ImageFile } from '@axe/core/storage/image-file';
import type { ChatMessage } from '@axe/domain/chat/chat-message';
import type { ChatTab } from '@axe/domain/chat/chat-tab';

export type ChatLogImageSrcResolver = (image: ImageFile) => string;
/** @deprecated Use {@link ChatLogImageSrcResolver}. Kept as alias for backward compatibility. */
/**
 * A hook that converts the raw name and body before they are escaped.
 * It is mainly for expanding a translation placeholder into the translated string.
 * Without one the text passes through.
 */
export type ChatLogTextDecoder = (text: string) => string;

type MessageFormatter = (tabName: string, message: ChatMessage) => string;

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  "'": '&#x27;',
  '`': '&#x60;',
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
};

export class ChatLogExporter {
  static readonly STYLE_BLOCK =
    '<style>' +
    '.m{display:flex;align-items:flex-start;margin:2px 0;line-height:1.5}' +
    '.tb{flex:0 0 auto;color:#888;font-size:.85em;margin-right:4px;padding-top:11px}' +
    '.tm{flex:0 0 auto;width:48px;color:#888;font-size:.85em;padding-top:11px}' +
    '.tc{flex:0 0 auto;margin-right:4px;padding-top:11px}' +
    '.av{display:inline-block;width:40px;height:40px;vertical-align:middle;margin-right:6px}' +
    '.ap{border:1px solid #ccc;border-radius:4px;background:#fff;object-fit:cover;object-position:50% 0}' +
    '.ct{flex:1 1 auto;min-width:0}' +
    '.bq{margin:0 4px 0 0;padding:2px 8px;border-left:3px solid #aaa;color:#666;font-size:.9em;background:#f7f7f7;display:inline-block;max-width:70%;vertical-align:middle}' +
    '.bn{font-weight:bold;margin-right:4px}' +
    '.ai{max-width:180px;max-height:120px;width:auto;height:auto;object-fit:contain;border:1px solid #ccc;border-radius:4px;background:#fff;vertical-align:top;margin:2px 4px 2px 0}' +
    '.aw{display:block;margin-top:6px;white-space:normal}' +
    '</style>\n';
  static escapeHtml(value: unknown): string {
    if (typeof value !== 'string') {
      return String(value);
    }
    const escaped = value.replace(/[&'`"<>]/g, (match) => HTML_ESCAPE_MAP[match] ?? match);
    return escaped.replace(/[|｜]([^|｜\s]+?)《(.+?)》/g, '<ruby>$1<rt>$2</rt></ruby>').replace(/\s/g, ' ');
  }

  static formatMessageStandard(
    isTime: boolean,
    tabName: string,
    message: ChatMessage,
    userId?: string,
    imageSrcResolver?: ChatLogImageSrcResolver,
    textDecoder?: ChatLogTextDecoder
  ): string {
    if (!message) return '';
    let str = '<div class="m">';

    if (tabName) {
      str += `<span class="tb">[${ChatLogExporter.escapeHtml(tabName)}]</span>`;
    }

    if (isTime) {
      const date = new Date(message.timestamp);
      const time = `${('00' + date.getHours()).slice(-2)}:${('00' + date.getMinutes()).slice(-2)}`;
      str += `<span class="tm">${time}</span>`;
    }

    str += ChatLogExporter.formatPortraitImage(message, imageSrcResolver);

    str += '<div class="ct">';
    str += ChatLogExporter.formatReferenceBlock(message, textDecoder);
    str += "<font color='";
    if (message.messColor) str += message.messColor.toLowerCase();
    str += "'>";

    const decodedName = ChatLogExporter.decode(message.name, textDecoder);
    str += '<b>';
    if (decodedName) str += ChatLogExporter.escapeHtml(decodedName);
    str += '</b>';

    const canSee = userId != null ? message.isSentBy(userId) : message.isSendFromSelf;
    str += '：';
    if (!message.isSecret || canSee) {
      const decodedText = ChatLogExporter.decode(message.text, textDecoder);
      if (decodedText) str += ChatLogExporter.escapeHtml(decodedText).replace(/\n/g, '<br>');
      str += ChatLogExporter.formatAttachmentImages(message, imageSrcResolver);
    } else {
      str += '（シークレットダイス）';
    }
    if (message.fixd) str += ' (編集済)';
    str += '</font>';
    str += '</div></div>\n';
    return str;
  }

  static formatMessageCoc(
    tabName: string,
    message: ChatMessage,
    userId?: string,
    imageSrcResolver?: ChatLogImageSrcResolver,
    textDecoder?: ChatLogTextDecoder
  ): string {
    if (!message) return '';
    let str = '';
    str += `    <div class="m" style="color:${message.messColor.toLowerCase()}">\n`;
    str += `      <span class="tc"> [${tabName}]</span>\n`;
    str += `      ${ChatLogExporter.formatPortraitImage(message, imageSrcResolver)}\n`;
    str += '      <div class="ct">\n';
    str += '        ';
    const refBlock = ChatLogExporter.formatReferenceBlock(message, textDecoder);
    if (refBlock) str += refBlock;
    const decodedName = ChatLogExporter.decode(message.name, textDecoder);
    str += `<span>${ChatLogExporter.escapeHtml(decodedName).replace('<', '').replace('>', '')}</span> `;

    const canSee = userId != null ? message.isSentBy(userId) : message.isSendFromSelf;
    if (!message.isSecret || canSee) {
      const decodedText = ChatLogExporter.decode(message.text, textDecoder);
      if (decodedText) str += ChatLogExporter.escapeHtml(decodedText).replace(/\n/g, '<br>').replace(/→/g, '＞');
      str += ChatLogExporter.formatAttachmentImages(message, imageSrcResolver);
    } else {
      str += '（シークレットダイス）';
    }
    if (message.fixd) str += ' (編集済)';
    str += '\n';

    str += '      </div>\n';
    str += '    </div>\n';
    str += '    \n';
    return str;
  }

  private static decode(text: string | null | undefined, textDecoder?: ChatLogTextDecoder): string {
    if (text == null) return '';
    return textDecoder ? textDecoder(text) : text;
  }

  static exportTabHtml(
    tab: ChatTab,
    userId?: string,
    imageSrcResolver?: ChatLogImageSrcResolver,
    textDecoder?: ChatLogTextDecoder
  ): string {
    const head = `<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Transitional//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'>
<html xmlns='http://www.w3.org/1999/xhtml' lang='ja'>
  <head>
    <meta http-equiv='Content-Type' content='text/html; charset=UTF-8' />
    <title>チャットログ：${ChatLogExporter.escapeHtml(tab.name)}</title>
    ${ChatLogExporter.STYLE_BLOCK}  </head>
  <body>
`;
    const parts: string[] = [];
    for (const mess of tab.chatMessages) {
      if (!ChatLogExporter.isVisibleMessage(mess, userId)) continue;
      parts.push(ChatLogExporter.formatMessageStandard(true, '', mess, userId, imageSrcResolver, textDecoder));
    }
    return head + parts.join('') + '\n  </body>\n</html>';
  }

  static exportTabHtmlCoc(
    tab: ChatTab,
    userId?: string,
    imageSrcResolver?: ChatLogImageSrcResolver,
    textDecoder?: ChatLogTextDecoder
  ): string {
    const head = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Udonalium Axe - logs</title>
    ${ChatLogExporter.STYLE_BLOCK}  </head>
  <body>

`;
    const parts: string[] = [];
    for (const mess of tab.chatMessages) {
      if (!ChatLogExporter.isVisibleMessage(mess, userId)) continue;
      parts.push(
        ChatLogExporter.formatMessageCoc(
          ChatLogExporter.escapeHtml(tab.name),
          mess,
          userId,
          imageSrcResolver,
          textDecoder
        )
      );
    }
    return head + parts.join('') + '  </body>\n</html>';
  }

  static exportAllTabsHtml(
    tabs: readonly ChatTab[],
    showTime: number | boolean,
    userId?: string,
    imageSrcResolver?: ChatLogImageSrcResolver,
    textDecoder?: ChatLogTextDecoder
  ): string {
    const head = `<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE html PUBLIC '-//W3C//DTD XHTML 1.0 Transitional//EN' 'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd'>
<html xmlns='http://www.w3.org/1999/xhtml' lang='ja'>
  <head>
    <meta http-equiv='Content-Type' content='text/html; charset=UTF-8' />
    <title>チャットログ：全タブ</title>
    ${ChatLogExporter.STYLE_BLOCK}  </head>
  <body>
`;
    const main = ChatLogExporter.mergeTabMessages(
      ChatLogExporter.spokenTabs(tabs),
      (tabName, message) =>
        ChatLogExporter.formatMessageStandard(!!showTime, tabName, message, userId, imageSrcResolver, textDecoder),
      userId
    );
    return head + main + '\n  </body>\n</html>';
  }

  static exportAllTabsHtmlCoc(
    tabs: readonly ChatTab[],
    userId?: string,
    imageSrcResolver?: ChatLogImageSrcResolver,
    textDecoder?: ChatLogTextDecoder
  ): string {
    const head = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Udonalium Axe - logs</title>
    ${ChatLogExporter.STYLE_BLOCK}  </head>
  <body>

`;
    const main = ChatLogExporter.mergeTabMessages(
      ChatLogExporter.spokenTabs(tabs),
      (tabName, message) => ChatLogExporter.formatMessageCoc(tabName, message, userId, imageSrcResolver, textDecoder),
      userId
    );
    return head + main + '  </body>\n</html>';
  }

  /**
   * The tabs that go into an export of them all.
   *
   * The system tab fills with arrivals and departures, and mixed in they sink the exchanges worth rereading.
   * A single-tab export can choose it, so it is there when it is wanted.
   */
  static spokenTabs(tabs: readonly ChatTab[]): readonly ChatTab[] {
    return tabs.filter((tab) => !tab.isSystemTab);
  }

  static isVisibleMessage(message: ChatMessage, userId?: string): boolean {
    const to = message.to;
    if (!to) return true;
    if (userId != null) {
      return to === userId || message.from === userId;
    }
    return message.isDisplayable;
  }

  private static mergeTabMessages(tabs: readonly ChatTab[], formatter: MessageFormatter, userId?: string): string {
    if (!tabs || tabs.length === 0) return '';
    const tabNum = tabs.length;
    const indexList = new Array<number>(tabNum).fill(0);
    const parts: string[] = [];

    while (true) {
      let fastTabIndex = -1;
      let earliestTimestamp = -1;

      for (let i = 0; i < tabNum; i++) {
        if (tabs[i].chatMessages.length <= indexList[i]) continue;
        const ts = tabs[i].chatMessages[indexList[i]].timestamp;
        if (earliestTimestamp === -1 || ts < earliestTimestamp) {
          earliestTimestamp = ts;
          fastTabIndex = i;
        }
      }
      if (fastTabIndex === -1) break;

      const message = tabs[fastTabIndex].chatMessages[indexList[fastTabIndex]];
      if (ChatLogExporter.isVisibleMessage(message, userId)) {
        parts.push(formatter(tabs[fastTabIndex].name, message));
      }
      indexList[fastTabIndex]++;
    }
    return parts.join('');
  }

  private static formatPortraitImage(message: ChatMessage, imageSrcResolver?: ChatLogImageSrcResolver): string {
    const portrait = message.image;
    const key = portrait ? (imageSrcResolver?.(portrait) ?? portrait.url) : '';
    if (!portrait || !key) {
      return '<span class="av"></span>';
    }
    const alt = message.name || 'portrait';
    return `<img data-img-key="${ChatLogExporter.escapeAttribute(key)}" alt="${ChatLogExporter.escapeAttribute(alt)}" class="av ap" />`;
  }

  // The message quoted or replied to is put in front of the body as a small quotation,
  // trimmed to about the length the chat itself previews.
  private static formatReferenceBlock(message: ChatMessage, textDecoder?: ChatLogTextDecoder): string {
    const quote = message.quoteOf ? message.quoteOfMessage : null;
    const reply = message.replyTo ? message.replyToMessage : null;
    if (!quote && !reply) return '';

    const blocks: string[] = [];
    if (quote) {
      blocks.push(
        ChatLogExporter.formatReferenceBlockBody({
          label: '引用',
          icon: '❝',
          target: quote,
          maxTextLength: 280,
          textDecoder,
        })
      );
    }
    if (reply) {
      blocks.push(
        ChatLogExporter.formatReferenceBlockBody({
          label: '返信先',
          icon: '↩',
          target: reply,
          maxTextLength: 120,
          textDecoder,
        })
      );
    }
    return blocks.join('');
  }

  private static formatReferenceBlockBody(opts: {
    label: string;
    icon: string;
    target: ChatMessage;
    maxTextLength: number;
    textDecoder?: ChatLogTextDecoder;
  }): string {
    const { label, icon, target, maxTextLength, textDecoder } = opts;
    const rawName = ChatLogExporter.decode(target.name, textDecoder);
    const rawText = ChatLogExporter.decode(target.text, textDecoder).replace(/\s+/g, ' ').trim();
    const truncated = rawText.length > maxTextLength ? rawText.slice(0, maxTextLength) + '…' : rawText;
    const name = ChatLogExporter.escapeHtml(rawName || label);
    const text = ChatLogExporter.escapeHtml(truncated);
    // It is drawn as a pale block with a rule down its left, so it reads apart from the body.
    // It sits compactly after the name, with the body on the next line.
    return (
      `<blockquote class="bq">` +
      `<span class="bn">${icon} ${name}</span>` +
      `<span>${text}</span>` +
      `</blockquote><br>`
    );
  }

  private static formatAttachmentImages(message: ChatMessage, imageSrcResolver?: ChatLogImageSrcResolver): string {
    const images = message.attachmentImages ?? [];
    if (images.length < 1) return '';

    const imageTags = images
      .map((image) => {
        const key = imageSrcResolver?.(image) ?? image.url;
        if (!key) return '';
        const alt = image.name || '添付画像';
        return `<img data-img-key="${ChatLogExporter.escapeAttribute(key)}" alt="${ChatLogExporter.escapeAttribute(alt)}" class="ai" />`;
      })
      .filter((imageTag) => imageTag.length > 0)
      .join('');

    if (!imageTags) return '';
    return `<span class="aw">${imageTags}</span>`;
  }

  private static escapeAttribute(value: string): string {
    return value.replace(/[&'`"<>]/g, (match) => HTML_ESCAPE_MAP[match] ?? match);
  }
}
