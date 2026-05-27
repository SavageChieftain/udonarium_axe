import type { ImageFile } from '@axe/core/storage/image-file';
import type { ChatMessage } from '@axe/domain/chat/chat-message';
import type { ChatTab } from '@axe/domain/chat/chat-tab';

export type ChatLogImageSrcResolver = (image: ImageFile) => string;
/** @deprecated Use {@link ChatLogImageSrcResolver}. Kept as alias for backward compatibility. */
export type ChatLogAttachmentImageSrcResolver = ChatLogImageSrcResolver;
export type ChatLogAttachmentImage = ChatMessage['attachmentImages'][number];

/**
 * message.name / message.text に対して escape 前の素のテキストを変換するフック。
 * 主用途は i18n プレースホルダー (`@i18n:common.chat.systemName:{}` のような string) を
 * 翻訳結果の通常文字列に展開すること。未指定なら素通し。
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
    let str = '';
    if (tabName) str += `[${ChatLogExporter.escapeHtml(tabName)}]`;

    if (isTime) {
      const date = new Date(message.timestamp);
      str += `${('00' + date.getHours()).slice(-2)}:${('00' + date.getMinutes()).slice(-2)}：`;
    }

    str += ChatLogExporter.formatReferenceBlock(message, textDecoder);
    str += ChatLogExporter.formatPortraitImage(message, imageSrcResolver);

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
    str += '</font><br>';
    str += '\n';
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
    str += `    <p style="color:${message.messColor.toLowerCase()};">\n`;
    str += `      <span> [${tabName}]</span>\n`;
    const refBlock = ChatLogExporter.formatReferenceBlock(message, textDecoder);
    if (refBlock) str += `      ${refBlock}\n`;
    const portraitImg = ChatLogExporter.formatPortraitImage(message, imageSrcResolver);
    if (portraitImg) str += `      ${portraitImg}\n`;
    const decodedName = ChatLogExporter.decode(message.name, textDecoder);
    str += `      <span>${ChatLogExporter.escapeHtml(decodedName).replace('<', '').replace('>', '')}</span>\n`;
    str += '      <span>\n';
    str += '        ';

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

    str += '      </span>\n';
    str += '    </p>\n';
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
  </head>
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
  </head>
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
  </head>
  <body>
`;
    const main = ChatLogExporter.mergeTabMessages(
      tabs,
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
  </head>
  <body>

`;
    const main = ChatLogExporter.mergeTabMessages(
      tabs,
      (tabName, message) => ChatLogExporter.formatMessageCoc(tabName, message, userId, imageSrcResolver, textDecoder),
      userId
    );
    return head + main + '  </body>\n</html>';
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

  // resolver は data URL ではなく短い「key」(レジストリの索引) を返す前提に変更している。
  // 出力 HTML は <img data-img-key="K" ...> となり、末尾に注入されるハイドレーション
  // スクリプトが key→data URL の辞書を引いて src を埋める。
  // これで同じ立ち絵が N 回登場しても base64 文字列は 1 回しか出ない。
  // 立ち絵は 40×40 の正方形枠で揃え、足りない場合は object-fit:cover で中央クロップする。
  private static formatPortraitImage(message: ChatMessage, imageSrcResolver?: ChatLogImageSrcResolver): string {
    const portrait = message.image;
    if (!portrait) return '';
    const key = imageSrcResolver?.(portrait) ?? portrait.url;
    if (!key) return '';
    const alt = message.name || 'portrait';
    return `<img data-img-key="${ChatLogExporter.escapeAttribute(key)}" alt="${ChatLogExporter.escapeAttribute(alt)}" style="width:40px;height:40px;vertical-align:middle;margin-right:6px;border:1px solid #cccccc;border-radius:4px;background:#ffffff;object-fit:cover;" />`;
  }

  // 引用 (quoteOf) / 返信 (replyTo) の被参照メッセージを小さな blockquote として
  // 本文の直前に挿入する。チャット UI 側のプレビューと同じ程度に長さを切り詰める。
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
    // 本文と区別しやすいよう左罫線つきの淡いブロックで描画。
    return (
      `<blockquote style="margin:4px 0 4px 6px;padding:2px 8px;` +
      `border-left:3px solid #aaaaaa;color:#666666;font-size:0.9em;background:#f7f7f7;` +
      `display:inline-block;max-width:100%;vertical-align:top;">` +
      `<span style="font-weight:bold;margin-right:4px;">${icon} ${name}</span>` +
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
        return `<img data-img-key="${ChatLogExporter.escapeAttribute(key)}" alt="${ChatLogExporter.escapeAttribute(alt)}" style="max-width:180px;max-height:120px;width:auto;height:auto;object-fit:contain;border:1px solid #cccccc;border-radius:4px;background:#ffffff;vertical-align:top;margin:2px 4px 2px 0;" />`;
      })
      .filter((imageTag) => imageTag.length > 0)
      .join('');

    if (!imageTags) return '';
    return `<span style="display:block;margin-top:6px;white-space:normal;">${imageTags}</span>`;
  }

  private static escapeAttribute(value: string): string {
    return value.replace(/[&'`"<>]/g, (match) => HTML_ESCAPE_MAP[match] ?? match);
  }
}
