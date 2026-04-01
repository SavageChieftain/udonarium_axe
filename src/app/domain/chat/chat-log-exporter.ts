import type { ChatMessage } from '@axe/domain/chat/chat-message';
import type { ChatTab } from '@axe/domain/chat/chat-tab';

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

  static formatMessageStandard(isTime: boolean, tabName: string, message: ChatMessage, userId?: string): string {
    if (!message) return '';
    let str = '';
    if (tabName) str += `[${ChatLogExporter.escapeHtml(tabName)}]`;

    if (isTime) {
      const date = new Date(message.timestamp);
      str += `${('00' + date.getHours()).slice(-2)}:${('00' + date.getMinutes()).slice(-2)}：`;
    }

    str += "<font color='";
    if (message.messColor) str += message.messColor.toLowerCase();
    str += "'>";

    str += '<b>';
    if (message.name) str += ChatLogExporter.escapeHtml(message.name);
    str += '</b>';

    const canSee = userId != null ? message.isSentBy(userId) : message.isSendFromSelf;
    str += '：';
    if (!message.isSecret || canSee) {
      if (message.text) str += ChatLogExporter.escapeHtml(message.text).replace(/\n/g, '<br>');
    } else {
      str += '（シークレットダイス）';
    }
    if (message.fixd) str += ' (編集済)';
    str += '</font><br>';
    str += '\n';
    return str;
  }

  static formatMessageCoc(tabName: string, message: ChatMessage, userId?: string): string {
    if (!message) return '';
    let str = '';
    str += `    <p style="color:${message.messColor.toLowerCase()};">\n`;
    str += `      <span> [${tabName}]</span>\n`;
    str += `      <span>${ChatLogExporter.escapeHtml(message.name ?? '')
      .replace('<', '')
      .replace('>', '')}</span>\n`;
    str += '      <span>\n';
    str += '        ';

    const canSee = userId != null ? message.isSentBy(userId) : message.isSendFromSelf;
    if (!message.isSecret || canSee) {
      if (message.text) str += ChatLogExporter.escapeHtml(message.text).replace(/\n/g, '<br>').replace(/→/g, '＞');
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

  static exportTabHtml(tab: ChatTab, userId?: string): string {
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
      parts.push(ChatLogExporter.formatMessageStandard(true, '', mess, userId));
    }
    return head + parts.join('') + '\n  </body>\n</html>';
  }

  static exportTabHtmlCoc(tab: ChatTab, userId?: string): string {
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
      parts.push(ChatLogExporter.formatMessageCoc(ChatLogExporter.escapeHtml(tab.name), mess, userId));
    }
    return head + parts.join('') + '  </body>\n</html>';
  }

  static exportAllTabsHtml(tabs: ChatTab[], showTime: number | boolean, userId?: string): string {
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
      (tabName, message) => ChatLogExporter.formatMessageStandard(!!showTime, tabName, message, userId),
      userId
    );
    return head + main + '\n  </body>\n</html>';
  }

  static exportAllTabsHtmlCoc(tabs: ChatTab[], userId?: string): string {
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
      (tabName, message) => ChatLogExporter.formatMessageCoc(tabName, message, userId),
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

  private static mergeTabMessages(tabs: ChatTab[], formatter: MessageFormatter, userId?: string): string {
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
}
